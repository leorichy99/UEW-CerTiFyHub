"""
Certificate rendering service.

Provides a unified interface for generating certificates in PDF and PNG formats,
orchestrating the PDF and PNG adapters.
"""

from .pdf_adapter import PDFRendererAdapter
from .png_adapter import PNGRendererAdapter
from .rendering_utils import hex_to_rgb
from io import BytesIO
from PIL import ImageDraw


class CertificateRenderingService:
    """
    Service for rendering certificates in multiple formats.
    
    Orchestrates PDF and PNG rendering adapters to provide a consistent
    interface for certificate generation.
    """
    
    def __init__(self):
        self.pdf_adapter = PDFRendererAdapter()
        self.png_adapter = PNGRendererAdapter()
    
    def render_pdf(self, template_data, certificate_data, output_buffer=None):
        """
        Render a certificate as PDF.
        
        Args:
            template_data: Template metadata and elements
            certificate_data: Certificate data for placeholder replacement
            output_buffer: Optional BytesIO buffer for output
        
        Returns:
            BytesIO buffer containing the PDF
        """
        canvas = self.pdf_adapter.create_canvas(output_buffer)
        width, height = self.pdf_adapter.page_size
        
        # Render background
        self._render_pdf_background(canvas, template_data, width, height)
        
        # Render elements
        self._render_pdf_elements(canvas, template_data, certificate_data, width, height)
        
        # Render QR code
        qr_data = self._get_qr_data(certificate_data)
        self.pdf_adapter.draw_qr_code(canvas, qr_data, width - 140, height - 140, 100)
        
        canvas.showPage()
        return self.pdf_adapter.save_canvas(canvas, output_buffer)
    
    def render_png(self, template_data, certificate_data, output_buffer=None, dpi_scale=1):
        """
        Render a certificate as PNG.
        
        Args:
            template_data: Template metadata and elements
            certificate_data: Certificate data for placeholder replacement
            output_buffer: Optional BytesIO buffer for output
            dpi_scale: Scale factor for target DPI (1 = 72 DPI, 4.167 = 300 DPI)
        
        Returns:
            BytesIO buffer containing the PNG
        """
        width = template_data.get('canvas_width', 800)
        height = template_data.get('canvas_height', 600)
        self.png_adapter.width = width
        self.png_adapter.height = height
        self.png_adapter.dpi_scale = dpi_scale
        
        # Render background
        background = template_data.get('background', {})
        bg_color = self._resolve_background_color(background)
        img = self.png_adapter.create_image(bg_color)
        draw = ImageDraw.Draw(img)
        
        # Render elements
        self._render_png_elements(draw, template_data, certificate_data, width, height)
        
        # Render QR code
        qr_data = self._get_qr_data(certificate_data)
        self.png_adapter.draw_qr_code(img, qr_data, width - 140, height - 140, 100)
        
        return self.png_adapter.save_image(img, output_buffer)
    
    def _render_pdf_background(self, canvas, template_data, width, height):
        """Render background for PDF."""
        background = template_data.get('background', {})
        if not background:
            return
        
        if background.get('kind') == 'gradient':
            # Gradient rendering logic would go here
            pass
        else:
            rgb = hex_to_rgb(background.get('color', '#ffffff'), (255, 255, 255))
            canvas.setFillColorRGB(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0)
            canvas.rect(0, 0, width, height, fill=1, stroke=0)
    
    def _render_pdf_elements(self, canvas, template_data, certificate_data, width, height):
        """Render elements for PDF."""
        elements = template_data.get('elements', [])
        
        for el in elements:
            el_type = el.get('type')
            
            if el_type == 'text':
                text = self._replace_placeholders(el.get('text', ''), certificate_data)
                x = el.get('x', 0)
                y = height - el.get('y', 0)  # PDF coordinates are flipped
                font_name = el.get('fontFamily', 'Helvetica')
                font_size = el.get('fontSize', 12)
                fill = el.get('fill', '#000000')
                align = el.get('align', 'left')
                max_width = el.get('width', 0)
                
                self.pdf_adapter.draw_text(
                    canvas, text, x, y, font_name, font_size,
                    fill, align, max_width
                )
            
            elif el_type == 'image':
                src = el.get('src', '')
                x = el.get('x', 0)
                y = height - el.get('y', 0)
                el_width = el.get('width')
                el_height = el.get('height')
                
                if src.startswith('data:'):
                    # Handle base64 images
                    pass
                else:
                    self.pdf_adapter.draw_image(canvas, src, x, y, el_width, el_height)
            
            elif el_type == 'logo':
                # Handle university logo
                logo_path = certificate_data.get('university_logo')
                if logo_path:
                    x = el.get('x', 0)
                    y = height - el.get('y', 0)
                    self.pdf_adapter.draw_image(canvas, logo_path, x, y, el.get('width'), el.get('height'))
    
    def _render_png_elements(self, draw, template_data, certificate_data, width, height):
        """Render elements for PNG."""
        elements = template_data.get('elements', [])
        
        for el in elements:
            el_type = el.get('type')
            
            if el_type == 'text':
                text = self._replace_placeholders(el.get('text', ''), certificate_data)
                x = el.get('x', 0)
                y = el.get('y', 0)
                font_name = el.get('fontFamily', 'Arial')
                font_size = el.get('fontSize', 12)
                fill = el.get('fill', '#000000')
                align = el.get('align', 'left')
                max_width = el.get('width', 0)
                
                self.png_adapter.draw_text(
                    draw, text, x, y, font_name, font_size,
                    fill, align, max_width
                )
            
            elif el_type == 'image':
                src = el.get('src', '')
                x = el.get('x', 0)
                y = el.get('y', 0)
                el_width = el.get('width')
                el_height = el.get('height')
                
                self.png_adapter.draw_image(draw, src, x, y, el_width, el_height)
            
            elif el_type == 'logo':
                logo_path = certificate_data.get('university_logo')
                if logo_path:
                    x = el.get('x', 0)
                    y = el.get('y', 0)
                    self.png_adapter.draw_image(draw, logo_path, x, y, el.get('width'), el.get('height'))
    
    def _replace_placeholders(self, text, certificate_data):
        """Replace placeholders in text with certificate data."""
        if not text:
            return ''
        
        placeholders = {
            '{student_name}': certificate_data.get('student_name', ''),
            '{program}': certificate_data.get('program', ''),
            '{degree}': certificate_data.get('degree_type', ''),
            '{date}': certificate_data.get('date_awarded', ''),
            '{certificate_number}': certificate_data.get('certificate_number', ''),
        }
        
        result = text
        for placeholder, value in placeholders.items():
            result = result.replace(placeholder, str(value))
        
        return result
    
    def _get_qr_data(self, certificate_data):
        """Generate QR code data for verification."""
        return f"https://verify.uew.edu.gh/{certificate_data.get('certificate_number', '')}"
    
    def _resolve_background_color(self, background):
        """Resolve background color from background config."""
        if not background:
            return '#ffffff'
        
        if background.get('color'):
            return background.get('color')
        
        if background.get('kind') == 'gradient':
            # For gradient, use the first stop color
            stops = background.get('gradient', {}).get('stops', [])
            if stops:
                return stops[0].get('color', '#ffffff')
        
        return '#ffffff'
