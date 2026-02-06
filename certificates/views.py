from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import FileResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from django.core.files import File
import os

from django.utils.dateparse import parse_date
from django.utils import timezone

from .models import Certificate
from .serializers import CertificateSerializer


import qrcode
from reportlab.lib.colors import HexColor

class CertificateViewSet(viewsets.ModelViewSet):
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    # override create to ensure PDF is generated and returned in response
    def create(self, request, *args, **kwargs):
        import traceback

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        cert = serializer.save()

        # If created by is not set, set it
        if not cert.created_by and request.user.is_authenticated:
            cert.created_by = request.user
            cert.save()

        try:
            self.generate_pdf_for_certificate(cert)
        except Exception as e:
            print('Error generating PDF:', e)
            print(traceback.format_exc())

        out_serializer = self.get_serializer(cert, context={'request': request})
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def bulk_issue(self, request):
        """
        Issue certificates to multiple students using a template.
        Expected data: { template_id: 1, student_ids: [1, 2, 3], date_awarded: '2026-01-21' }
        """
        template_id = request.data.get('template_id')
        student_ids = request.data.get('student_ids', [])
        date_awarded = request.data.get('date_awarded')

        parsed_date_awarded = None
        if date_awarded:
            if isinstance(date_awarded, str):
                parsed_date_awarded = parse_date(date_awarded)
                if not parsed_date_awarded:
                    return Response(
                        {'error': 'Invalid date_awarded format. Use YYYY-MM-DD.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                parsed_date_awarded = date_awarded

        if not template_id or not student_ids:
            return Response({'error': 'template_id and student_ids are required'}, status=status.HTTP_400_BAD_REQUEST)

        from templates.models import CertificateTemplate
        from students.models import Student
        
        try:
            template = CertificateTemplate.objects.get(id=template_id)
        except CertificateTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)

        students = Student.objects.filter(id__in=student_ids)
        issued_certs = []

        for student in students:
            cert = Certificate.objects.create(
                student=student,
                template=template,
                student_name=student.full_name,
                program=student.program,
                date_awarded=parsed_date_awarded or student.graduation_date,
                # Copy other defaults if necessary
                degree_type='BSC', # Default or pull from student metadata?
                honors='PASS',
                created_by=request.user
            )
            try:
                self.generate_pdf_for_certificate(cert)
            except Exception as e:
                print(f"Failed to generate PDF for {student.full_name}: {e}")
            
            issued_certs.append(cert)

        return Response(CertificateSerializer(issued_certs, many=True, context={'request': request}).data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def bulk_bundle(self, request):
        """Return a single multi-page PDF for a list of issued certificates."""
        certificate_ids = request.data.get('certificate_ids', [])
        if not isinstance(certificate_ids, list) or not certificate_ids:
            return Response({'error': 'certificate_ids must be a non-empty list'}, status=status.HTTP_400_BAD_REQUEST)

        cert_qs = Certificate.objects.filter(id__in=certificate_ids)
        cert_map = {str(c.id): c for c in cert_qs}
        ordered_certs = [cert_map.get(str(cid)) for cid in certificate_ids]
        ordered_certs = [c for c in ordered_certs if c is not None]

        if not ordered_certs:
            return Response({'error': 'No certificates found'}, status=status.HTTP_404_NOT_FOUND)

        buffer = BytesIO()

        first = ordered_certs[0]
        first_size = (first.template.canvas_width, first.template.canvas_height) if first.template else A4
        p = canvas.Canvas(buffer, pagesize=first_size)

        for idx, cert in enumerate(ordered_certs):
            page_size = (cert.template.canvas_width, cert.template.canvas_height) if cert.template else A4
            if idx > 0:
                p.showPage()
                p.setPageSize(page_size)

            width, height = page_size
            if cert.template:
                self._generate_from_template(p, cert, width, height)
            else:
                self._generate_default_layout(p, cert, width, height)

            self._add_qr_code(p, cert, width, height)

        p.save()
        buffer.seek(0)

        ts = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f'bulk_certificates_{ts}.pdf'
        return FileResponse(buffer, as_attachment=True, filename=filename)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        certificate = self.get_object()
        if not certificate.pdf_file:
            self.generate_pdf_for_certificate(certificate)
        
        if certificate.pdf_file:
            return FileResponse(
                certificate.pdf_file.open('rb'),
                as_attachment=True,
                filename=f'certificate_{certificate.certificate_number}.pdf'
            )
        return Response({'error': 'PDF failed'}, status=500)
    
    def generate_pdf_for_certificate(self, certificate):
        buffer = BytesIO()
        
        # Determine page size based on template or default A4
        if certificate.template:
            # We use the template dimensions as points (ReportLab units)
            # A4 is approx 595x842. If template is 800x600, we might want to scale or use custom size.
            page_size = (certificate.template.canvas_width, certificate.template.canvas_height)
        else:
            page_size = A4
            
        p = canvas.Canvas(buffer, pagesize=page_size)
        width, height = page_size
        
        if certificate.template:
            self._generate_from_template(p, certificate, width, height)
        else:
            self._generate_default_layout(p, certificate, width, height)
            
        # Add QR Code for verification
        self._add_qr_code(p, certificate, width, height)
        
        p.showPage()
        p.save()
        
        buffer.seek(0)
        filename = f'certificate_{certificate.certificate_number}.pdf'
        certificate.pdf_file.save(filename, File(buffer), save=True)
        return certificate

    def _generate_from_template(self, p, cert, width, height):
        template = cert.template
        metadata = template.metadata
        elements = metadata.get('elements', [])
        
        # Background color/image if template has it
        p.setFillColorRGB(1, 1, 1) # Default white for custom templates
        p.rect(0, 0, width, height, fill=1)
        
        for el in elements:
            if el.get('type') == 'text':
                text = el.get('text', '')
                # Replace placeholders
                text = text.replace('{student_name}', cert.student_name or '')
                text = text.replace('{program}', cert.program or '')
                text = text.replace('{date}', str(cert.date_awarded))
                text = text.replace('{cert_no}', cert.certificate_number or '')
                
                # Konva Y is from top, PDF Y is from bottom
                pdf_x = el.get('x', 0)
                pdf_y = height - el.get('y', 0) - el.get('fontSize', 12) # Subtract fontSize for baseline approx
                
                # Font handling
                font_name = "Helvetica" # Default
                if "Bold" in el.get('fontStyle', ''): font_name = "Helvetica-Bold"
                
                p.setFont(font_name, el.get('fontSize', 12))
                
                color = el.get('fill', 'black')
                if color.startswith('#'):
                    p.setFillColor(HexColor(color))
                else:
                    p.setFillColorRGB(0,0,0)
                
                p.drawString(pdf_x, pdf_y, text)

    def _generate_default_layout(self, p, certificate, width, height):
        # Existing logic refactored
        p.setFillColorRGB(0.98, 0.97, 0.94)
        p.rect(0, 0, width, height, fill=1)
        p.setStrokeColorRGB(0.2, 0.2, 0.2)
        p.setLineWidth(4)
        p.rect(30, 30, width-60, height-60, fill=0)
        
        p.setFont("Times-Bold", 24)
        p.setFillColorRGB(0.2, 0.2, 0.2)
        p.drawCentredString(width/2, height-90, "UNIVERSITY OF EDUCATION, WINNEBA")
        
        def get_image_path(model_field, default_name):
            if model_field: return model_field.path
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            default_path = os.path.join(base_dir, 'certificate-frontend', 'public', default_name)
            return default_path if os.path.exists(default_path) else None

        logo_path = get_image_path(certificate.university_logo, 'uew-logo.png')
        if logo_path:
            p.drawImage(ImageReader(logo_path), width/2-50, height-250, 100, 100, mask='auto', preserveAspectRatio=True)
            
        p.setFont("Times-Italic", 24)
        p.drawCentredString(width/2, height-300, "This is to Certify that")
        p.setFont("Helvetica-Bold", 28)
        p.drawCentredString(width/2, height-350, certificate.student_name.upper())
        
        body_y = height - 400
        body_lines = [
            "having pursued the prescribed programme of studies at",
            "the University of Education, Winneba, Ghana",
            "and having passed the prescribed Examinations,",
            f"has on the {self.format_date(certificate.date_awarded)}",
            "been admitted to the degree of"
        ]
        p.setFont("Times-Italic", 15)
        for line in body_lines:
            p.drawCentredString(width/2, body_y, line)
            body_y -= 25
            
        p.setFont("Helvetica-Bold", 22)
        p.drawCentredString(width/2, body_y - 15, certificate.get_degree_type_display())

        p.drawCentredString(width/2, body_y - 70, "in")
        p.setFont("Helvetica-Bold", 18)
        p.drawCentredString(width/2, body_y - 100, certificate.program)

        p.setFont("Times-Italic", 15)
        p.drawCentredString(width/2, body_y - 45, f"with {certificate.get_honors_display()}")
        p.setFont("Times-Roman", 15)
        
        sig_y = 100
        p.setFont("Helvetica-Bold", 11)
        p.line(width/2-70, sig_y-5, width/2+70, sig_y-5)
        p.drawCentredString(width/2, sig_y-22, "Vice-Chancellor")
        p.line(width-220, sig_y-5, width-80, sig_y-5)
        p.drawCentredString(width-150, sig_y-22, "Registrar")

    def _add_qr_code(self, p, cert, width, height):
        # Generate QR code URL
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        verify_url = f"{frontend_url}/verify/{cert.id}"
        
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(verify_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        qr_buffer = BytesIO()
        img.save(qr_buffer)
        qr_buffer.seek(0)
        
        p.drawImage(ImageReader(qr_buffer), 50, 50, 60, 60)
        p.setFont("Helvetica", 7)
        p.drawString(50, 40, "Scan to verify")

    def format_date(self, date):
        if not date: return ""
        day = date.day
        suffix = 'th' if 11 <= day <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')
        return f"{day}{suffix} day of {date.strftime('%B, %Y')}"
