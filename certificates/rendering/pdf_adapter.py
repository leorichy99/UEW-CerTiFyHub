"""
PDF renderer adapter for certificate generation.

This adapter encapsulates PDF generation logic using ReportLab,
providing a clean interface for certificate rendering.
"""

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from io import BytesIO
import os
import qrcode

from ..rendering_utils import wrap_text, hex_to_rgb


class PDFRendererAdapter:
    """
    Adapter for generating PDF certificates.
    
    Handles PDF canvas creation, element rendering, and final output generation.
    """
    
    def __init__(self, page_size=A4):
        self.page_size = page_size
        self._font_path_cache = {}
        self._registered_fonts = {}
    
    def create_canvas(self, buffer=None):
        """Create a new PDF canvas."""
        if buffer is None:
            buffer = BytesIO()
        return canvas.Canvas(buffer, pagesize=self.page_size)
    
    def register_font(self, name, path):
        """Register a custom font for PDF rendering."""
        if name not in self._registered_fonts:
            pdfmetrics.registerFont(TTFont(name, path))
            self._registered_fonts[name] = path
    
    def get_font_path(self, font_name):
        """Get the file path for a font."""
        if font_name in self._font_path_cache:
            return self._font_path_cache[font_name]
        
        # Default font paths
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        font_paths = [
            os.path.join(base_dir, 'fonts', f'{font_name}.ttf'),
            os.path.join(base_dir, 'public', 'fonts', f'{font_name}.ttf'),
            os.path.join(base_dir, 'static', 'fonts', f'{font_name}.ttf'),
        ]
        
        for path in font_paths:
            if os.path.exists(path):
                self._font_path_cache[font_name] = path
                return path
        
        return None
    
    def draw_text(self, canvas, text, x, y, font_name, font_size, fill='#000000',
                 align='left', max_width=0, line_height=None):
        """
        Draw text on the canvas with optional word wrapping.
        
        Args:
            canvas: ReportLab canvas
            text: Text to draw
            x: X coordinate
            y: Y coordinate
            font_name: Font name
            font_size: Font size in points
            fill: Fill color (hex)
            align: Text alignment ('left', 'center', 'right')
            max_width: Maximum width for wrapping
            line_height: Line height multiplier (default 1.2)
        """
        if not text:
            return
        
        line_height = line_height or font_size * 1.2
        rgb = hex_to_rgb(fill, (0, 0, 0))
        
        canvas.setFont(font_name, font_size)
        canvas.setFillColorRGB(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0)
        
        # Handle explicit newlines, then word-wrap each paragraph
        paragraphs = text.split('\n')
        wrapped_lines = []
        for para in paragraphs:
            if max_width and max_width > 0:
                wrapped_lines.extend(wrap_text(para, font_name, font_size, max_width))
            else:
                wrapped_lines.append(para)
        
        for i, line in enumerate(wrapped_lines):
            y_offset = y + font_size + i * line_height
            
            if align == 'center':
                if max_width:
                    center_x = x + max_width / 2
                    canvas.drawCentredString(center_x, y_offset, line)
                else:
                    # Konva: x is the center point when no width is set
                    canvas.drawCentredString(x, y_offset, line)
            elif align == 'right':
                if max_width:
                    right_x = x + max_width
                    canvas.drawRightString(right_x, y_offset, line)
                else:
                    # Konva: x is the right edge when no width is set
                    canvas.drawRightString(x, y_offset, line)
            else:
                canvas.drawString(x, y_offset, line)
    
    def draw_image(self, canvas, image_path, x, y, width=None, height=None):
        """
        Draw an image on the canvas.
        
        Args:
            canvas: ReportLab canvas
            image_path: Path to image file
            x: X coordinate
            y: Y coordinate
            width: Optional width (maintains aspect ratio if not specified)
            height: Optional height
        """
        try:
            img = ImageReader(image_path)
            img_width, img_height = img.getSize()
            
            if width and height:
                pass  # Use specified dimensions
            elif width:
                height = img_height * (width / img_width)
            elif height:
                width = img_width * (height / img_height)
            else:
                width, height = img_width, img_height
            
            canvas.drawImage(img, x, y, width, height, mask='auto')
        except Exception as e:
            print(f"Warning: could not draw image {image_path}: {e}")
    
    def draw_rectangle(self, canvas, x, y, width, height, fill=None, stroke=None, stroke_width=1):
        """Draw a rectangle on the canvas."""
        if fill:
            rgb = hex_to_rgb(fill, (0, 0, 0))
            canvas.setFillColorRGB(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0)
            canvas.rect(x, y, width, height, fill=1, stroke=0)
        
        if stroke:
            rgb = hex_to_rgb(stroke, (0, 0, 0))
            canvas.setStrokeColorRGB(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0)
            canvas.setLineWidth(stroke_width)
            canvas.rect(x, y, width, height, fill=0, stroke=1)
    
    def draw_qr_code(self, canvas, data, x, y, size=100):
        """
        Draw a QR code on the canvas.
        
        Args:
            canvas: ReportLab canvas
            data: Data to encode in QR code
            x: X coordinate
            y: Y coordinate
            size: Size of QR code in points
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert PIL image to ReportLab compatible format
        from io import BytesIO
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        canvas.drawImage(img, x, y, size, size, mask='auto')
    
    def save_canvas(self, canvas, buffer=None):
        """Save the canvas to a buffer."""
        canvas.save()
        if buffer:
            buffer.seek(0)
        return buffer
