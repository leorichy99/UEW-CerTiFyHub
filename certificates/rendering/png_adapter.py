"""
PNG renderer adapter for certificate generation.

This adapter encapsulates PNG generation logic using PIL (Pillow),
providing a clean interface for certificate rendering.
"""

from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import os
import base64
import math
import qrcode

from ..rendering_utils import hex_to_rgb


class PNGRendererAdapter:
    """
    Adapter for generating PNG certificate previews.
    
    Handles PIL image creation, element rendering, and final output generation.
    """
    
    def __init__(self, width=800, height=600):
        self.width = width
        self.height = height
    
    def create_image(self, background_color='#ffffff'):
        """Create a new PIL image."""
        rgb = hex_to_rgb(background_color, (255, 255, 255))
        return Image.new('RGB', (self.width, self.height), rgb)
    
    def get_font(self, font_name, size):
        """Load a PIL font."""
        # Try to find the font file
        font_path = self._get_font_path(font_name)
        if font_path and os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except:
                pass
        
        # Fall back to default font
        try:
            return ImageFont.load_default()
        except:
            return None
    
    def _get_font_path(self, font_name):
        """Get the file path for a font."""
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        font_paths = [
            os.path.join(base_dir, 'fonts', f'{font_name}.ttf'),
            os.path.join(base_dir, 'public', 'fonts', f'{font_name}.ttf'),
            os.path.join(base_dir, 'static', 'fonts', f'{font_name}.ttf'),
        ]
        
        for path in font_paths:
            if os.path.exists(path):
                return path
        
        return None
    
    def draw_text(self, draw, text, x, y, font_name, font_size, fill='#000000',
                 align='left', max_width=0, line_height=None):
        """
        Draw text on the image with optional word wrapping.
        
        Args:
            draw: PIL ImageDraw object
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
        
        font = self.get_font(font_name, font_size)
        line_height = line_height or font_size * 1.2
        rgb = hex_to_rgb(fill, (0, 0, 0))
        
        def _measure_line(s):
            """Measure line width using PIL."""
            try:
                return font.getlength(s)
            except:
                bb = draw.textbbox((0, 0), s, font=font)
                return bb[2] - bb[0]
        
        # Tolerance for sub-pixel font metric differences
        wrap_limit = (max_width or 0) + max(2, font_size * 0.15)
        
        def _wrap_line(s):
            if max_width <= 0:
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
            if align == 'center' and max_width:
                tw = _measure_line(line)
                lx = x + (max_width - tw) / 2
            elif align == 'right' and max_width:
                tw = _measure_line(line)
                lx = x + max_width - tw
            else:
                lx = x
            draw.text((lx, ly), line, fill=rgb, font=font)
    
    def draw_image(self, img, image_path, x, y, width=None, height=None):
        """
        Draw an image on the canvas.
        
        Args:
            img: PIL image
            image_path: Path to image file or base64 data URI
            x: X coordinate
            y: Y coordinate
            width: Optional width
            height: Optional height
        """
        try:
            if image_path.startswith('data:'):
                _, b64data = image_path.split(',', 1)
                img_bytes = base64.b64decode(b64data)
                el_img = Image.open(BytesIO(img_bytes)).convert('RGBA')
            else:
                el_img = Image.open(image_path).convert('RGBA')
            
            el_w = width or el_img.width
            el_h = height or el_img.height
            el_img = el_img.resize((int(el_w), int(el_h)), Image.LANCZOS)
            
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
                draw = ImageDraw.Draw(img)
            img.paste(el_img, (int(x), int(y)), el_img)
        except Exception as e:
            print(f"Warning: could not draw image {image_path}: {e}")
    
    def draw_rectangle(self, draw, x, y, width, height, fill=None, stroke=None, stroke_width=1):
        """Draw a rectangle on the image."""
        fill_c = hex_to_rgb(fill, None) if (fill and fill != 'transparent') else None
        stroke_c = hex_to_rgb(stroke, None) if (stroke and stroke != 'transparent') else None
        
        draw.rectangle([x, y, x + width, y + height], fill=fill_c, outline=stroke_c, width=stroke_width)
    
    def draw_ellipse(self, draw, x, y, width, height, fill=None, stroke=None, stroke_width=1):
        """Draw an ellipse on the image."""
        fill_c = hex_to_rgb(fill, None) if (fill and fill != 'transparent') else None
        stroke_c = hex_to_rgb(stroke, None) if (stroke and stroke != 'transparent') else None
        
        draw.ellipse([x, y, x + width, y + height], fill=fill_c, outline=stroke_c, width=stroke_width)
    
    def draw_polygon(self, draw, points, fill=None, stroke=None, stroke_width=1):
        """Draw a polygon on the image."""
        fill_c = hex_to_rgb(fill, None) if (fill and fill != 'transparent') else None
        stroke_c = hex_to_rgb(stroke, None) if (stroke and stroke != 'transparent') else None
        
        draw.polygon(points, fill=fill_c, outline=stroke_c, width=stroke_width)
    
    def draw_qr_code(self, img, data, x, y, size=100):
        """
        Draw a QR code on the image.
        
        Args:
            img: PIL image
            data: Data to encode in QR code
            x: X coordinate
            y: Y coordinate
            size: Size of QR code in pixels
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGBA')
        qr_img = qr_img.resize((size, size), Image.LANCZOS)
        
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
            draw = ImageDraw.Draw(img)
        img.paste(qr_img, (int(x), int(y)), qr_img)
    
    def save_image(self, img, buffer=None, format='PNG'):
        """Save the image to a buffer."""
        if buffer is None:
            buffer = BytesIO()
        img.save(buffer, format=format)
        buffer.seek(0)
        return buffer
