from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import FileResponse, HttpResponse, JsonResponse
from django.db.models import Q
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from django.core.files import File
import os
import json

from django.utils.dateparse import parse_date
from django.utils import timezone

from .models import Certificate
from .serializers import CertificateSerializer
from analytics.utils import log_audit
from notifications.services import notify
from core.permissions import HasPermission, IsActiveAccount


import qrcode
from reportlab.lib.colors import HexColor

class CertificateViewSet(viewsets.ModelViewSet):
    serializer_class = CertificateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [permissions.IsAuthenticated, IsActiveAccount]
    _font_path_cache = {}
    _registered_pdf_fonts = {}

    def get_permissions(self):
        """Map actions to granular permission keys."""
        perm_map = {
            'create': 'certificates.issue',
            'update': 'certificates.edit_drafts',
            'partial_update': 'certificates.edit_drafts',
            'destroy': 'certificates.issue',
            'revoke': 'certificates.revoke',
            'reactivate': 'certificates.revoke',
            'bulk_issue': 'certificates.issue',
            'bulk_bundle': 'certificates.download',
            'download': 'certificates.download',
            'get_preview': 'certificates.view_all',
            'list': 'certificates.view_all',
            'retrieve': 'certificates.view_all',
        }
        perm_key = perm_map.get(self.action)
        if perm_key:
            return [permissions.IsAuthenticated(), IsActiveAccount(), HasPermission.of(perm_key)()]
        return super().get_permissions()

    def get_queryset(self):
        qs = Certificate.objects.all().order_by('-generated_date')
        params = self.request.query_params

        search = params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(student_name__icontains=search) |
                Q(certificate_number__icontains=search)
            )

        program = params.get('program', '').strip()
        if program:
            qs = qs.filter(program=program)

        honors = params.get('honors', '').strip()
        if honors:
            qs = qs.filter(honors=honors)

        status_filter = params.get('status', '').strip()
        if status_filter:
            qs = qs.filter(status=status_filter)

        date_from = params.get('date_from', '').strip()
        if date_from:
            qs = qs.filter(date_awarded__gte=date_from)

        date_to = params.get('date_to', '').strip()
        if date_to:
            qs = qs.filter(date_awarded__lte=date_to)

        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def destroy(self, request, *args, **kwargs):
        """
        Custom delete method with debugging and enhanced error handling
        """
        print(f"=== Certificate Delete Debug ===")
        print(f"Delete request for certificate ID: {kwargs.get('pk')}")
        print(f"Request user: {request.user}")
        print(f"Request method: {request.method}")
        
        try:
            instance = self.get_object()
            print(f"Certificate found: {instance}")
            print(f"Certificate student_name: {instance.student_name}")
            print(f"Certificate pdf_file: {instance.pdf_file}")
            print(f"Certificate university_logo: {instance.university_logo}")
            print(f"Certificate vc_signature: {instance.vc_signature}")
            print(f"Certificate registrar_signature: {instance.registrar_signature}")
            
            # Store file paths for cleanup logging
            files_to_delete = []
            if instance.pdf_file:
                files_to_delete.append(str(instance.pdf_file.path))
            if instance.university_logo:
                files_to_delete.append(str(instance.university_logo.path))
            if instance.vc_signature:
                files_to_delete.append(str(instance.vc_signature.path))
            if instance.registrar_signature:
                files_to_delete.append(str(instance.registrar_signature.path))
            
            print(f"Files that will be deleted: {files_to_delete}")
            
            # Perform the delete
            self.perform_destroy(instance)
            print("Certificate deleted successfully from database")
            log_audit(request=request, action='Deleted certificate',
                      target=f'{instance.student_name} - {instance.certificate_number}',
                      details=f'Certificate {instance.certificate_number} deleted',
                      category='admin')
            
            # Check if files were actually deleted
            for file_path in files_to_delete:
                if file_path and os.path.exists(file_path):
                    print(f"Warning: File still exists after deletion: {file_path}")
                else:
                    print(f"File successfully deleted: {file_path}")
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Certificate.DoesNotExist:
            print(f"Certificate with ID {kwargs.get('pk')} not found")
            return Response(
                {'error': f'Certificate with ID {kwargs.get("pk")} not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            print(f"Permission error deleting certificate files: {str(e)}")
            return Response(
                {'error': 'Permission denied when deleting certificate files'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except OSError as e:
            print(f"OS error deleting certificate: {str(e)}")
            return Response(
                {'error': f'File system error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            print(f"Unexpected error deleting certificate: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Unexpected error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # override create to ensure PDF is generated and returned in response
    def create(self, request, *args, **kwargs):
        import traceback
        
        print("=== Certificate Creation Debug ===")
        print("Request data:", request.data)
        print("Request files:", request.FILES)
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        cert = serializer.save()
        print("Certificate created:", cert.id)

        # If created by is not set, set it
        if not cert.created_by and request.user.is_authenticated:
            cert.created_by = request.user
            cert.save()

        try:
            print("Generating PDF...")
            self.generate_pdf_for_certificate(cert)
            print("PDF generated successfully")
        except Exception as e:
            print('Error generating PDF:', e)
            print(traceback.format_exc())

        log_audit(request=request, action='Created certificate',
                  target=f'{cert.student_name} - {cert.certificate_number}',
                  details=f'Certificate {cert.certificate_number} issued for {cert.program}',
                  category='admin')

        # Notify issuing admin
        notify(
            recipient=request.user,
            title='Certificate Issued',
            message=f'Certificate {cert.certificate_number} issued for {cert.student_name} ({cert.program})',
            notification_type='certificate_issued',
            priority='success',
            related_object_id=str(cert.id),
            related_object_type='certificate',
            request=request,
        )

        out_serializer = self.get_serializer(cert, context={'request': request})
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke an active certificate."""
        certificate = self.get_object()
        if certificate.status == 'REVOKED':
            return Response({'error': 'Certificate is already revoked.'}, status=status.HTTP_400_BAD_REQUEST)
        certificate.status = 'REVOKED'
        certificate.save(update_fields=['status'])
        log_audit(request=request, action='Revoked certificate',
                  target=f'{certificate.student_name} - {certificate.certificate_number}',
                  details=f'Certificate {certificate.certificate_number} revoked',
                  category='admin')

        # Notify admin + broadcast to super admins
        notify(
            recipient=request.user,
            title='Certificate Revoked',
            message=f'Certificate {certificate.certificate_number} for {certificate.student_name} has been revoked',
            notification_type='certificate_revoked',
            priority='warning',
            related_object_id=str(certificate.id),
            related_object_type='certificate',
            request=request,
        )
        notify(
            role_target='SUPER_ADMIN',
            title='Certificate Revoked',
            message=f'{request.user.username} revoked certificate {certificate.certificate_number} ({certificate.student_name})',
            notification_type='certificate_revoked',
            priority='warning',
            related_object_id=str(certificate.id),
            related_object_type='certificate',
            request=request,
        )

        return Response(CertificateSerializer(certificate, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        """Reactivate a revoked certificate."""
        certificate = self.get_object()
        if certificate.status != 'REVOKED':
            return Response({'error': 'Certificate is not revoked.'}, status=status.HTTP_400_BAD_REQUEST)
        certificate.status = 'ISSUED'
        certificate.save(update_fields=['status'])
        log_audit(request=request, action='Reactivated certificate',
                  target=f'{certificate.student_name} - {certificate.certificate_number}',
                  details=f'Certificate {certificate.certificate_number} reactivated',
                  category='admin')

        # Notify admin
        notify(
            recipient=request.user,
            title='Certificate Reactivated',
            message=f'Certificate {certificate.certificate_number} for {certificate.student_name} has been reactivated',
            notification_type='certificate_reactivated',
            priority='success',
            related_object_id=str(certificate.id),
            related_object_type='certificate',
            request=request,
        )

        return Response(CertificateSerializer(certificate, context={'request': request}).data)

    @action(detail=False, methods=['post'])
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
                degree_type=getattr(student, 'degree_type', '') or 'BSC',
                honors=getattr(student, 'honors', '') or 'PASS',
                created_by=request.user
            )
            try:
                self.generate_pdf_for_certificate(cert)
            except Exception as e:
                print(f"Failed to generate PDF for {student.full_name}: {e}")
            
            issued_certs.append(cert)

        log_audit(request=request, action='Bulk issued certificates',
                  target=f'{len(issued_certs)} certificates',
                  details=f'Bulk issued {len(issued_certs)} certificates using template {template.id}',
                  category='admin')

        # Notify issuing admin of bulk completion
        notify(
            recipient=request.user,
            title='Bulk Issuance Complete',
            message=f'{len(issued_certs)} certificates issued successfully using template "{template.name}"',
            notification_type='bulk_issuance_complete',
            priority='success',
            related_object_type='certificate',
            metadata={'count': len(issued_certs), 'template_id': template_id},
            request=request,
        )

        return Response(CertificateSerializer(issued_certs, many=True, context={'request': request}).data)

    @action(detail=False, methods=['post'])
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
        if certificate.pdf_file and certificate.pdf_file.name:
            try:
                return FileResponse(
                    certificate.pdf_file.open('rb'),
                    as_attachment=True,
                    filename=f'certificate_{certificate.certificate_number}.pdf'
                )
            except Exception:
                pass

        try:
            self.generate_pdf_for_certificate(certificate)
        except Exception as e:
            import traceback
            traceback.print_exc()
            if certificate.pdf_file and certificate.pdf_file.name:
                try:
                    return FileResponse(
                        certificate.pdf_file.open('rb'),
                        as_attachment=True,
                        filename=f'certificate_{certificate.certificate_number}.pdf'
                    )
                except Exception:
                    pass
            return Response({'error': f'PDF generation failed: {str(e)}'}, status=500)

        if certificate.pdf_file:
            return FileResponse(
                certificate.pdf_file.open('rb'),
                as_attachment=True,
                filename=f'certificate_{certificate.certificate_number}.pdf'
            )
        return Response({'error': 'PDF failed'}, status=500)
    
    # Get certificate PNG preview
    @action(detail=True, methods=['get'], url_path='preview')
    def get_preview(self, request, pk=None):
        """Generate PNG preview of certificate using template data."""
        try:
            certificate = self.get_object()

            if not certificate.template:
                width, height = self._get_page_size(certificate)
                img = self._generate_default_preview_image(certificate, width, height)
                buffer = BytesIO()
                img.save(buffer, format='PNG')
                buffer.seek(0)
                response = HttpResponse(buffer.read(), content_type='image/png')
                response['Content-Disposition'] = f'inline; filename="certificate_{certificate.id}_preview.png"'
                return response

            template = certificate.template
            render_state = self._get_template_render_state(template)
            metadata = render_state['metadata']
            elements = render_state['elements']
            background = render_state['background']

            from PIL import Image, ImageDraw, ImageFont
            import io
            import base64

            width, height = self._get_page_size(certificate)
            width = int(width)
            height = int(height)

            # ── Background ──
            import math as _math
            if background and background.get('kind') == 'gradient':
                gradient_info = background.get('gradient', {})
                stops = gradient_info.get('stops', [])
                angle = gradient_info.get('angle', 90)
                if len(stops) >= 2:
                    c1 = self._hex_to_rgb(stops[0].get('color', '#ffffff'))
                    c2 = self._hex_to_rgb(stops[1].get('color', '#000000'))
                    # Draw gradient line by line using PIL
                    img = Image.new('RGB', (width, height))
                    draw_bg = ImageDraw.Draw(img)
                    rad = _math.radians(angle)
                    cos_a, sin_a = _math.cos(rad), _math.sin(rad)
                    denom = width * abs(cos_a) + height * abs(sin_a)
                    for row in range(height):
                        t = (width / 2 * cos_a + row * sin_a) / max(denom, 1)
                        t = max(0.0, min(1.0, t))
                        r = int(c1[0] + (c2[0] - c1[0]) * t)
                        g = int(c1[1] + (c2[1] - c1[1]) * t)
                        b = int(c1[2] + (c2[2] - c1[2]) * t)
                        draw_bg.line([(0, row), (width, row)], fill=(r, g, b))
                else:
                    bg_rgb = self._resolve_background_rgb_from_value(background)
                    img = Image.new('RGB', (width, height), bg_rgb)
            else:
                bg_rgb = self._resolve_background_rgb_from_value(background)
                img = Image.new('RGB', (width, height), bg_rgb)
            draw = ImageDraw.Draw(img)

            # ── Helper: load a PIL font ──
            def _load_font(el, size):
                return self._load_preview_font(el, size)

            # ── Render elements ──
            import math

            def _png_fill_stroke(el):
                """Return (fill_rgb_or_None, stroke_rgb_or_None) for PIL."""
                fc = el.get('fill', '')
                sc = el.get('stroke', '')
                fill_c = self._hex_to_rgb(fc, None) if (fc and fc != 'transparent') else None
                stroke_c = self._hex_to_rgb(sc, None) if (sc and sc != 'transparent') else None
                return fill_c, stroke_c

            for el in elements:
                el_type = el.get('type')
                try:
                    if el_type == 'text':
                        text = self._replace_placeholders(el.get('text', ''), certificate)
                        if not text:
                            continue
                        x = el.get('x', 0)
                        y = el.get('y', 0)
                        font_size = el.get('fontSize', 16)
                        el_width = el.get('width', 0)
                        align = el.get('align', 'left')
                        wrap_mode = str(el.get('wrap', 'word')).lower()
                        fill_rgb = self._hex_to_rgb(el.get('fill', '#000000'), (0, 0, 0))
                        font = _load_font(el, font_size)
                        line_height = font_size * 1.2

                        def _measure_line(s):
                            # Prefer getlength (advance width, matches browser measureText)
                            # over textbbox (includes glyph overhang) so wrapping aligns with Konva.
                            try:
                                return font.getlength(s)
                            except Exception:
                                bb = draw.textbbox((0, 0), s, font=font)
                                return bb[2] - bb[0]

                        # Tolerance to absorb sub-pixel font metric differences
                        # between PIL and Konva (browser canvas) so near-fit lines
                        # don't get split into "Title" / "that".
                        wrap_limit = (el_width or 0) + max(2, font_size * 0.15)

                        def _wrap_line(s):
                            if wrap_mode == 'none' or not el_width or el_width <= 0:
                                return [s]
                            words = s.split(' ')
                            out = []
                            cur = ''
                            for w in words:
                                test = f'{cur} {w}'.strip() if cur else w
                                if _measure_line(test) <= wrap_limit or not cur:
                                    cur = test
                                else:
                                    out.append(cur)
                                    cur = w
                            if cur:
                                out.append(cur)
                            return out or ['']

                        # Split explicit newlines then word-wrap each paragraph
                        lines = []
                        for para in text.split('\n'):
                            lines.extend(_wrap_line(para))

                        for i, line in enumerate(lines):
                            ly = y + i * line_height
                            if align == 'center' and el_width:
                                tw = _measure_line(line)
                                lx = x + (el_width - tw) / 2
                            elif align == 'right' and el_width:
                                tw = _measure_line(line)
                                lx = x + el_width - tw
                            else:
                                lx = x
                            draw.text((lx, ly), line, fill=fill_rgb, font=font)

                    elif el_type == 'image':
                        src = el.get('src', '')
                        if src.startswith('data:'):
                            _, b64data = src.split(',', 1)
                            img_bytes = base64.b64decode(b64data)
                            el_img = Image.open(io.BytesIO(img_bytes)).convert('RGBA')
                            el_w = el.get('width', el_img.width)
                            el_h = el.get('height', el_img.height)
                            el_img = el_img.resize((int(el_w), int(el_h)), Image.LANCZOS)
                            # Convert main image to RGBA for compositing if needed
                            if img.mode != 'RGBA':
                                img = img.convert('RGBA')
                                draw = ImageDraw.Draw(img)
                            img.paste(el_img, (int(el.get('x', 0)), int(el.get('y', 0))), el_img)

                    elif el_type == 'logo':
                        logo_path = None
                        if hasattr(certificate, 'university_logo') and certificate.university_logo and certificate.university_logo.name:
                            try:
                                logo_path = certificate.university_logo.path
                            except Exception:
                                logo_path = None
                        if not logo_path:
                            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                            for cand in ['public/uew-logo.png', 'static/uew-logo.png', 'media/logos/uew-logo.png']:
                                cp = os.path.join(base_dir, cand)
                                if os.path.exists(cp):
                                    logo_path = cp
                                    break
                        if logo_path and os.path.exists(logo_path):
                            logo_img = Image.open(logo_path).convert('RGBA')
                            lw = int(el.get('width', 120))
                            lh = int(el.get('height', 120))
                            logo_img = logo_img.resize((lw, lh), Image.LANCZOS)
                            if img.mode != 'RGBA':
                                img = img.convert('RGBA')
                                draw = ImageDraw.Draw(img)
                            img.paste(logo_img, (int(el.get('x', 0)), int(el.get('y', 0))), logo_img)

                    elif el_type == 'qr_placeholder':
                        qr_w = max(1, int(el.get('width', 100)))
                        qr_h = max(1, int(el.get('height', 100)))
                        qr_img = self._make_qr_image(certificate, qr_w, qr_h)
                        if img.mode != 'RGBA':
                            img = img.convert('RGBA')
                            draw = ImageDraw.Draw(img)
                        img.paste(qr_img, (int(el.get('x', 0)), int(el.get('y', 0))), qr_img)

                    elif el_type and el_type.startswith('shape_'):
                        ex, ey = el.get('x', 0), el.get('y', 0)
                        ew, eh = el.get('width', 100), el.get('height', 100)
                        fill_c, stroke_c = _png_fill_stroke(el)
                        sw = el.get('strokeWidth', 1)

                        if el_type in ('shape_rect', 'shape_roundrect', 'shape_frame'):
                            draw.rectangle([ex, ey, ex + ew, ey + eh], fill=fill_c, outline=stroke_c, width=sw)

                        elif el_type == 'shape_ellipse':
                            draw.ellipse([ex, ey, ex + ew, ey + eh], fill=fill_c, outline=stroke_c, width=sw)

                        elif el_type == 'shape_line':
                            draw.line([ex, ey, ex + ew, ey], fill=stroke_c or (0, 0, 0), width=sw)

                        elif el_type in ('shape_polygon', 'shape_star'):
                            num_pts = el.get('points', 5)
                            cx_k = ex + ew / 2
                            cy_k = ey + eh / 2
                            rx, ry = ew / 2, eh / 2

                            pts = []
                            if el_type == 'shape_star':
                                inner_r = el.get('innerRadius', 50)
                                irx = rx * inner_r / 100.0
                                iry = ry * inner_r / 100.0
                                total = num_pts * 2
                                for i in range(total):
                                    a = (math.pi * 2 * i / total) - math.pi / 2
                                    if i % 2 == 0:
                                        pts.append((cx_k + rx * math.cos(a), cy_k + ry * math.sin(a)))
                                    else:
                                        pts.append((cx_k + irx * math.cos(a), cy_k + iry * math.sin(a)))
                            else:
                                for i in range(num_pts):
                                    a = (math.pi * 2 * i / num_pts) - math.pi / 2
                                    pts.append((cx_k + rx * math.cos(a), cy_k + ry * math.sin(a)))

                            if pts:
                                draw.polygon(pts, fill=fill_c, outline=stroke_c, width=sw)

                        elif el_type in ('shape_arc', 'shape_wedge'):
                            angle = el.get('angle', 90)
                            draw.arc([ex, ey, ex + ew, ey + eh], 0, angle, fill=stroke_c or (0, 0, 0), width=sw)

                except Exception as e:
                    print(f"Warning: could not render preview element {el.get('id')}: {e}")
                    import traceback
                    traceback.print_exc()
                    continue

            # Convert to PNG
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)

            response = HttpResponse(buffer.read(), content_type='image/png')
            response['Content-Disposition'] = f'inline; filename="certificate_{certificate.id}_preview.png"'
            return response

        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': f'Preview generation failed: {str(e)}'}, status=500)
    
    def generate_pdf_for_certificate(self, certificate):
        buffer = BytesIO()
        
        page_size = self._get_page_size(certificate)
            
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

    # ── Shared helpers ──────────────────────────────────────────────
    @staticmethod
    def _hex_to_rgb(hex_color, default=(255, 255, 255)):
        """Convert '#RRGGBB' to (R, G, B) tuple (0-255)."""
        try:
            if isinstance(hex_color, str) and hex_color.startswith('#'):
                h = hex_color.lstrip('#')
                if len(h) == 3:
                    h = ''.join(c * 2 for c in h)
                return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
        except Exception:
            pass
        return default

    @staticmethod
    def _resolve_background_rgb(metadata):
        """Return (R, G, B) 0-255 from template metadata background."""
        bg = metadata.get('canvas', {}).get('background') or metadata.get('background')
        if not bg:
            return (255, 255, 255)
        kind = bg.get('kind', 'solid')
        if kind == 'solid':
            return CertificateViewSet._hex_to_rgb(bg.get('color', '#ffffff'))
        elif kind == 'gradient':
            gradient = bg.get('gradient', {})
            stops = gradient.get('stops', bg.get('stops', []))
            if stops:
                return CertificateViewSet._hex_to_rgb(stops[0].get('color', '#ffffff'))
        return (255, 255, 255)

    @staticmethod
    def _resolve_background_rgb_from_value(background):
        """Return (R, G, B) 0-255 from a background object."""
        if not background:
            return (255, 255, 255)
        kind = background.get('kind', 'solid')
        if kind == 'solid':
            return CertificateViewSet._hex_to_rgb(background.get('color', '#ffffff'))
        if kind == 'gradient':
            gradient = background.get('gradient', {})
            stops = gradient.get('stops', background.get('stops', []))
            if stops:
                return CertificateViewSet._hex_to_rgb(stops[0].get('color', '#ffffff'))
        return (255, 255, 255)

    @staticmethod
    def _get_verification_url(cert):
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        return f"{frontend_url}/verify/{cert.id}"

    def _make_qr_image(self, cert, width=None, height=None):
        from PIL import Image

        verify_url = self._get_verification_url(cert)
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(verify_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        if hasattr(img, 'get_image'):
            img = img.get_image()
        img = img.convert('RGBA')

        if width and height:
            img = img.resize((int(width), int(height)), Image.LANCZOS)

        return img

    def _get_template_render_state(self, template):
        metadata = template.metadata or {}
        if isinstance(metadata, str):
            metadata = json.loads(metadata)

        canvas_meta = metadata.get('canvas') or {}
        preset_id = canvas_meta.get('presetId') or 'a4_landscape'
        elements_by_preset = metadata.get('elements_by_preset') or {}
        background_by_preset = metadata.get('background_by_preset') or {}

        elements = elements_by_preset.get(preset_id)
        if not isinstance(elements, list):
            elements = metadata.get('elements', []) or []

        background = background_by_preset.get(preset_id)
        if not isinstance(background, dict):
            background = canvas_meta.get('background') or metadata.get('background')

        return {
            'metadata': metadata,
            'canvas': canvas_meta,
            'preset_id': preset_id,
            'elements': elements,
            'background': background,
        }

    @staticmethod
    def _replace_placeholders(text, cert):
        """Replace template placeholders with certificate data."""
        text = text.replace('{student_name}', cert.student_name or '')
        text = text.replace('{program}', cert.program or '')
        if cert.date_awarded:
            d = cert.date_awarded
            day = d.day
            suffix = 'th' if 11 <= day <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')
            text = text.replace('{date}', f"{day}{suffix} day of {d.strftime('%B, %Y')}")
        else:
            text = text.replace('{date}', '')
        text = text.replace('{cert_no}', cert.certificate_number or '')
        text = text.replace('{degree}', cert.get_degree_type_display() if cert.degree_type else '')
        text = text.replace('{honors}', cert.get_honors_display() if cert.honors else '')
        return text

    @staticmethod
    def _font_style_flags(el):
        bold = el.get('bold', False)
        italic = el.get('italic', False)
        fs = str(el.get('fontStyle', ''))
        if 'bold' in fs.lower():
            bold = True
        if 'italic' in fs.lower():
            italic = True
        return bold, italic

    def _find_font_path(self, font_family, bold=False, italic=False):
        if not font_family:
            return None

        cache_key = (font_family, bold, italic)
        if cache_key in self.__class__._font_path_cache:
            return self.__class__._font_path_cache[cache_key]

        path = None

        # 1. Try local font store (downloads Google Fonts on first use)
        try:
            from .font_manager import get_font_path
            path = get_font_path(font_family, bold=bold, italic=italic)
        except Exception:
            path = None

        # 2. Fallback to matplotlib's findfont for system-installed fonts
        if not path:
            try:
                from matplotlib.font_manager import FontProperties, findfont

                variants = [
                    ('bold' if bold else 'normal', 'italic' if italic else 'normal'),
                    ('normal', 'italic' if italic else 'normal'),
                    ('bold' if bold else 'normal', 'normal'),
                    ('normal', 'normal'),
                ]

                for weight, style in variants:
                    try:
                        candidate = findfont(
                            FontProperties(family=[font_family], weight=weight, style=style),
                            fallback_to_default=False,
                        )
                    except Exception:
                        candidate = None

                    if candidate and os.path.exists(candidate):
                        path = candidate
                        break
            except Exception:
                path = None

        self.__class__._font_path_cache[cache_key] = path
        return path

    def _load_preview_font(self, el, size):
        from PIL import ImageFont

        bold, italic = self._font_style_flags(el)
        font_family = el.get('fontFamily')
        font_path = self._find_font_path(font_family, bold=bold, italic=italic)
        if font_path:
            try:
                return ImageFont.truetype(font_path, int(size))
            except Exception:
                pass

        candidates = []
        if bold and italic:
            candidates += ['arialbi.ttf', 'Arial Bold Italic.ttf']
        elif bold:
            candidates += ['arialbd.ttf', 'Arial Bold.ttf']
        elif italic:
            candidates += ['ariali.ttf', 'Arial Italic.ttf']
        candidates += ['arial.ttf', 'Arial.ttf', 'DejaVuSans.ttf']

        for name in candidates:
            try:
                return ImageFont.truetype(name, int(size))
            except OSError:
                pass

        if os.name == 'nt':
            fonts_dir = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts')
            for name in candidates:
                try:
                    return ImageFont.truetype(os.path.join(fonts_dir, name), int(size))
                except OSError:
                    pass

        return ImageFont.load_default()

    def _resolve_pdf_font_name(self, el):
        import hashlib

        bold, italic = self._font_style_flags(el)
        font_family = el.get('fontFamily')

        # 1. Try bundled font registry (pre-registered with ReportLab)
        try:
            from .font_manager import get_pdf_font_name
            rl_name = get_pdf_font_name(font_family, bold=bold, italic=italic)
            if rl_name:
                return rl_name
        except Exception:
            pass

        # 2. Fallback: resolve via filesystem path and register on-the-fly
        font_path = self._find_font_path(font_family, bold=bold, italic=italic)

        if font_path:
            cache_key = (font_path, bold, italic)
            registered_name = self.__class__._registered_pdf_fonts.get(cache_key)
            if registered_name:
                return registered_name

            registered_name = f"SysFont_{hashlib.md5(f'{font_path}|{bold}|{italic}'.encode('utf-8')).hexdigest()[:10]}"
            try:
                if registered_name not in pdfmetrics.getRegisteredFontNames():
                    pdfmetrics.registerFont(TTFont(registered_name, font_path))
                self.__class__._registered_pdf_fonts[cache_key] = registered_name
                return registered_name
            except Exception:
                pass

        return self._pdf_font_name(el)

    def _get_page_size(self, certificate):
        if certificate.template and certificate.template.canvas_width and certificate.template.canvas_height:
            return (certificate.template.canvas_width, certificate.template.canvas_height)

        from reportlab.lib.pagesizes import letter, A3 as A3_SIZE

        paper_map = {
            'LETTER': letter,
            'A3': A3_SIZE,
            'A4': A4,
        }
        return paper_map.get(certificate.paper_size, A4)

    def _generate_default_preview_image(self, certificate, width, height):
        from PIL import Image, ImageDraw

        width = int(width)
        height = int(height)
        img = Image.new('RGB', (width, height), (250, 247, 240))
        draw = ImageDraw.Draw(img)
        draw.rectangle([30, 30, width - 30, height - 30], outline=(51, 51, 51), width=4)

        def center_text(text, y, font_size, bold=False, italic=False):
            font = self._load_preview_font(
                {
                    'fontFamily': 'Times New Roman',
                    'bold': bold,
                    'italic': italic,
                },
                font_size,
            )
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            draw.text(((width - text_width) / 2, y), text, fill=(51, 51, 51), font=font)

        center_text("UNIVERSITY OF EDUCATION, WINNEBA", 65, 24, bold=True)
        center_text("This is to Certify that", 255, 24, italic=True)
        center_text((certificate.student_name or "").upper(), 315, 28, bold=True)

        body_y = 380
        body_lines = [
            "having pursued the prescribed programme of studies at",
            "the University of Education, Winneba, Ghana",
            "and having passed the prescribed Examinations,",
            f"has on the {self.format_date(certificate.date_awarded)}",
            "been admitted to the degree of",
        ]
        for line in body_lines:
            center_text(line, body_y, 15, italic=True)
            body_y += 24

        center_text(certificate.get_degree_type_display(), body_y + 8, 22, bold=True)
        center_text("in", body_y + 56, 15)
        center_text(certificate.program or "", body_y + 84, 18, bold=True)
        center_text(f"with {certificate.get_honors_display()}", body_y + 122, 15, italic=True)

        return img

    @staticmethod
    def _pdf_font_name(el):
        """Map template bold/italic/fontStyle to a ReportLab built-in font."""
        bold, italic = CertificateViewSet._font_style_flags(el)
        if bold and italic:
            return 'Helvetica-BoldOblique'
        if bold:
            return 'Helvetica-Bold'
        if italic:
            return 'Helvetica-Oblique'
        return 'Helvetica'

    # ── PDF generation from template ─────────────────────────────
    def _generate_from_template(self, p, cert, width, height):
        template = cert.template
        render_state = self._get_template_render_state(template)
        metadata = render_state['metadata']
        elements = render_state['elements']
        background = render_state['background']

        # ── Background ──
        import math as _math
        if background and background.get('kind') == 'gradient':
            gradient_info = background.get('gradient', {})
            stops = gradient_info.get('stops', [])
            angle = gradient_info.get('angle', 90)
            if len(stops) >= 2:
                c1 = self._hex_to_rgb(stops[0].get('color', '#ffffff'))
                c2 = self._hex_to_rgb(stops[1].get('color', '#000000'))
                # Draw gradient as thin horizontal strips
                num_strips = max(height, 1)
                rad = _math.radians(angle)
                cos_a, sin_a = _math.cos(rad), _math.sin(rad)
                denom = width * abs(cos_a) + height * abs(sin_a)
                for sy in range(int(num_strips)):
                    # Use center of strip for color calculation
                    # For each strip, compute average t across the width
                    t_avg = (width / 2 * cos_a + sy * sin_a) / max(denom, 1)
                    t_avg = max(0.0, min(1.0, t_avg))
                    r = (c1[0] + (c2[0] - c1[0]) * t_avg) / 255.0
                    g = (c1[1] + (c2[1] - c1[1]) * t_avg) / 255.0
                    b = (c1[2] + (c2[2] - c1[2]) * t_avg) / 255.0
                    p.setFillColorRGB(r, g, b)
                    # ReportLab Y is from bottom
                    p.rect(0, height - sy - 1, width, 1, fill=1, stroke=0)
            else:
                bg_rgb = self._resolve_background_rgb_from_value(background)
                p.setFillColorRGB(bg_rgb[0] / 255.0, bg_rgb[1] / 255.0, bg_rgb[2] / 255.0)
                p.rect(0, 0, width, height, fill=1)
        else:
            bg_rgb = self._resolve_background_rgb_from_value(background)
            p.setFillColorRGB(bg_rgb[0] / 255.0, bg_rgb[1] / 255.0, bg_rgb[2] / 255.0)
            p.rect(0, 0, width, height, fill=1)

        for el in elements:
            el_type = el.get('type')
            try:
                if el_type == 'text':
                    self._pdf_draw_text(p, el, cert, width, height)
                elif el_type == 'image':
                    self._pdf_draw_image(p, el, width, height)
                elif el_type == 'logo':
                    self._pdf_draw_logo(p, el, cert, width, height)
                elif el_type and el_type.startswith('shape_'):
                    self._pdf_draw_shape(p, el, width, height)
            except Exception as e:
                import traceback
                print(f"Warning: could not render element {el.get('id')}: {e}")
                traceback.print_exc()

    @staticmethod
    def _wrap_text(text, font_name, font_size, max_width):
        """Word-wrap text into lines that fit within max_width —
        mirrors Konva <Text> wrapping behaviour.

        A small tolerance is added to absorb sub-pixel font metric
        differences between ReportLab and the browser canvas (Konva),
        so near-fit lines don't get split unexpectedly.
        """
        if max_width <= 0:
            return [text]

        wrap_limit = max_width + max(2, font_size * 0.15)

        words = text.split(' ')
        lines = []
        current_line = ''

        for word in words:
            test_line = f'{current_line} {word}'.strip() if current_line else word
            w = pdfmetrics.stringWidth(test_line, font_name, font_size)
            if w <= wrap_limit or not current_line:
                current_line = test_line
            else:
                lines.append(current_line)
                current_line = word

        if current_line:
            lines.append(current_line)

        return lines or ['']

    def _pdf_draw_text(self, p, el, cert, canvas_w, canvas_h):
        text = self._replace_placeholders(el.get('text', ''), cert)
        if not text:
            return

        font_size = el.get('fontSize', 16)
        font_name = self._resolve_pdf_font_name(el)
        fill = el.get('fill', '#000000')
        rgb = self._hex_to_rgb(fill, (0, 0, 0))
        align = el.get('align', 'left')
        el_width = el.get('width', 0)
        line_height = font_size * 1.2

        p.setFont(font_name, font_size)
        p.setFillColorRGB(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0)

        konva_x = el.get('x', 0)
        konva_y = el.get('y', 0)

        # Handle explicit newlines, then word-wrap each paragraph
        paragraphs = text.split('\n')
        wrapped_lines = []
        for para in paragraphs:
            if el_width:
                wrapped_lines.extend(self._wrap_text(para, font_name, font_size, el_width))
            else:
                wrapped_lines.append(para)

        for i, line in enumerate(wrapped_lines):
            y_offset = konva_y + font_size + i * line_height
            pdf_y = canvas_h - y_offset

            if align == 'center' and el_width:
                center_x = konva_x + el_width / 2
                p.drawCentredString(center_x, pdf_y, line)
            elif align == 'right' and el_width:
                right_x = konva_x + el_width
                p.drawRightString(right_x, pdf_y, line)
            else:
                p.drawString(konva_x, pdf_y, line)

    def _pdf_draw_image(self, p, el, canvas_w, canvas_h):
        """Render a base64 data-URI image element."""
        import base64
        src = el.get('src', '')
        if not src:
            return
        # Decode data URI
        if src.startswith('data:'):
            header, b64data = src.split(',', 1)
            img_bytes = base64.b64decode(b64data)
        else:
            return  # Only data URIs supported for now

        img_buf = BytesIO(img_bytes)
        img_reader = ImageReader(img_buf)

        x = el.get('x', 0)
        y = el.get('y', 0)
        w = el.get('width', 100)
        h = el.get('height', 100)
        pdf_y = canvas_h - y - h  # Flip Y

        p.drawImage(img_reader, x, pdf_y, w, h, mask='auto', preserveAspectRatio=True)

    def _pdf_draw_logo(self, p, el, cert, canvas_w, canvas_h):
        """Render the university logo element."""
        logo_path = None
        # Check if cert has a logo file uploaded
        if hasattr(cert, 'university_logo') and cert.university_logo and cert.university_logo.name:
            try:
                logo_path = cert.university_logo.path
            except Exception:
                logo_path = None

        if not logo_path:
            # Try default logo from project directories
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            for candidate in ['public/uew-logo.png', 'static/uew-logo.png', 'media/logos/uew-logo.png']:
                candidate_path = os.path.join(base_dir, candidate)
                if os.path.exists(candidate_path):
                    logo_path = candidate_path
                    break

        print(f"[PDF] logo_path resolved to: {logo_path}")
        if not logo_path or not os.path.exists(logo_path):
            print(f"[PDF] WARNING: logo not found, skipping logo element")
            return

        x = el.get('x', 0)
        y = el.get('y', 0)
        w = el.get('width', 120)
        h = el.get('height', 120)
        pdf_y = canvas_h - y - h

        p.drawImage(ImageReader(logo_path), x, pdf_y, w, h, mask='auto', preserveAspectRatio=True)

    def _pdf_draw_shape(self, p, el, canvas_w, canvas_h):
        """Render shape_* elements (rect, ellipse, star, polygon, line, etc.)."""
        import math
        el_type = el.get('type', '')
        x = el.get('x', 0)
        y = el.get('y', 0)
        w = el.get('width', 100)
        h = el.get('height', 100)
        rotation = el.get('rotation', 0)
        pdf_y = canvas_h - y - h

        fill_color = el.get('fill', '')
        stroke_color = el.get('stroke', '#000000')
        stroke_width = el.get('strokeWidth', 1)

        # 'transparent' or empty means no fill
        has_fill = fill_color and fill_color != 'transparent'
        has_stroke = stroke_color and stroke_color != 'transparent'

        if has_fill:
            rgb = self._hex_to_rgb(fill_color)
            p.setFillColorRGB(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0)
        if has_stroke:
            rgb = self._hex_to_rgb(stroke_color, (0, 0, 0))
            p.setStrokeColorRGB(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0)
        p.setLineWidth(stroke_width)

        # Apply rotation around element center
        if rotation:
            cx = x + w / 2
            cy = canvas_h - y - h / 2
            p.saveState()
            p.translate(cx, cy)
            p.rotate(-rotation)  # Konva clockwise, ReportLab counter-clockwise
            p.translate(-cx, -cy)

        if el_type in ('shape_rect', 'shape_roundrect', 'shape_frame'):
            corner = el.get('cornerRadius', 0)
            if corner and el_type == 'shape_roundrect':
                p.roundRect(x, pdf_y, w, h, corner, fill=1 if has_fill else 0, stroke=1 if has_stroke else 0)
            else:
                p.rect(x, pdf_y, w, h, fill=1 if has_fill else 0, stroke=1 if has_stroke else 0)

        elif el_type == 'shape_ellipse':
            # Konva ellipse x,y is center; stored x,y is top-left after transform
            p.ellipse(x, pdf_y, x + w, pdf_y + h, fill=1 if has_fill else 0, stroke=1 if has_stroke else 0)

        elif el_type == 'shape_line':
            # Line from top-left to top-left + width
            p.line(x, canvas_h - y, x + w, canvas_h - y)

        elif el_type in ('shape_polygon', 'shape_star'):
            # Draw as a polygon path
            num_points = el.get('points', 5) if el_type == 'shape_polygon' else el.get('points', 5)
            inner_radius_pct = el.get('innerRadius', 50) if el_type == 'shape_star' else None
            cx_k = x + w / 2  # Konva center X
            cy_k = y + h / 2  # Konva center Y
            rx = w / 2
            ry = h / 2
            # PDF center
            cx_p = cx_k
            cy_p = canvas_h - cy_k

            path = p.beginPath()
            if el_type == 'shape_star' and inner_radius_pct is not None:
                # Star: alternate outer and inner points
                total = num_points * 2
                inner_rx = rx * inner_radius_pct / 100.0
                inner_ry = ry * inner_radius_pct / 100.0
                for i in range(total):
                    angle = (math.pi * 2 * i / total) - math.pi / 2
                    if i % 2 == 0:
                        px = cx_p + rx * math.cos(angle)
                        py = cy_p + ry * math.sin(angle)
                    else:
                        px = cx_p + inner_rx * math.cos(angle)
                        py = cy_p + inner_ry * math.sin(angle)
                    if i == 0:
                        path.moveTo(px, py)
                    else:
                        path.lineTo(px, py)
            else:
                # Regular polygon
                for i in range(num_points):
                    angle = (math.pi * 2 * i / num_points) - math.pi / 2
                    px = cx_p + rx * math.cos(angle)
                    py = cy_p + ry * math.sin(angle)
                    if i == 0:
                        path.moveTo(px, py)
                    else:
                        path.lineTo(px, py)
            path.close()
            p.drawPath(path, fill=1 if has_fill else 0, stroke=1 if has_stroke else 0)

        elif el_type in ('shape_arc', 'shape_wedge'):
            angle = el.get('angle', 90)
            # Draw as an arc/wedge
            cx_p = x + w / 2
            cy_p = canvas_h - y - h / 2
            p.arc(cx_p - w/2, cy_p - h/2, cx_p + w/2, cy_p + h/2, 0, angle)

        if rotation:
            p.restoreState()

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
        placeholder = None
        if cert.template:
            render_state = self._get_template_render_state(cert.template)
            placeholder = next(
                (el for el in render_state['elements'] if el.get('type') == 'qr_placeholder'),
                None,
            )

        if placeholder:
            qr_x = float(placeholder.get('x', 50))
            qr_y = float(placeholder.get('y', height - 110))
            qr_w = max(1, float(placeholder.get('width', 60)))
            qr_h = max(1, float(placeholder.get('height', 60)))
            label_y = None
        else:
            qr_x = 50
            qr_y = height - 110
            qr_w = 60
            qr_h = 60
            label_y = 40

        img = self._make_qr_image(cert, qr_w, qr_h)

        qr_buffer = BytesIO()
        img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)

        pdf_y = height - qr_y - qr_h
        p.drawImage(ImageReader(qr_buffer), qr_x, pdf_y, qr_w, qr_h)

        if label_y is not None:
            p.setFont("Helvetica", 7)
            p.drawString(50, label_y, "Scan to verify")

    def format_date(self, date):
        if not date: return ""
        day = date.day
        suffix = 'th' if 11 <= day <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')
        return f"{day}{suffix} day of {date.strftime('%B, %Y')}"
