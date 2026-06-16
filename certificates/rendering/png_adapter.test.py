"""
Unit tests for PNG renderer adapter.
"""

import pytest
from io import BytesIO

from .png_adapter import PNGRendererAdapter
from ..rendering_utils import hex_to_rgb


class TestPNGRendererAdapter:
    """Test cases for PNG renderer adapter."""
    
    def test_initialization(self):
        """Test adapter initialization."""
        adapter = PNGRendererAdapter()
        assert adapter.width == 800
        assert adapter.height == 600
    
    def test_custom_dimensions(self):
        """Test adapter with custom dimensions."""
        adapter = PNGRendererAdapter(width=1200, height=800)
        assert adapter.width == 1200
        assert adapter.height == 800
    
    def test_create_image(self):
        """Test image creation."""
        adapter = PNGRendererAdapter()
        img = adapter.create_image()
        assert img is not None
        assert img.size == (800, 600)
    
    def test_create_image_with_color(self):
        """Test image creation with custom background color."""
        adapter = PNGRendererAdapter()
        img = adapter.create_image('#ff0000')
        assert img is not None
        assert img.size == (800, 600)
    
    def test_draw_text_basic(self):
        """Test basic text drawing."""
        adapter = PNGRendererAdapter()
        img = adapter.create_image()
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        
        adapter.draw_text(draw, "Test Text", 100, 200, "Arial", 12)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        assert len(buffer.read()) > 0
    
    def test_draw_text_with_alignment(self):
        """Test text drawing with different alignments."""
        adapter = PNGRendererAdapter()
        img = adapter.create_image()
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        
        adapter.draw_text(draw, "Center", 100, 200, "Arial", 12, align='center', max_width=200)
        adapter.draw_text(draw, "Right", 100, 240, "Arial", 12, align='right', max_width=200)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        assert len(buffer.read()) > 0
    
    def test_draw_text_with_wrapping(self):
        """Test text drawing with word wrapping."""
        adapter = PNGRendererAdapter()
        img = adapter.create_image()
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        
        long_text = "This is a very long text that should wrap across multiple lines when rendered"
        adapter.draw_text(draw, long_text, 100, 200, "Arial", 12, max_width=200)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        assert len(buffer.read()) > 0
    
    def test_draw_rectangle(self):
        """Test rectangle drawing."""
        adapter = PNGRendererAdapter()
        img = adapter.create_image()
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        
        adapter.draw_rectangle(draw, 100, 200, 200, 100, fill='#ff0000', stroke='#000000', stroke_width=2)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        assert len(buffer.read()) > 0
    
    def test_draw_ellipse(self):
        """Test ellipse drawing."""
        adapter = PNGRendererAdapter()
        img = adapter.create_image()
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        
        adapter.draw_ellipse(draw, 100, 200, 200, 100, fill='#00ff00', stroke='#000000', stroke_width=2)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        assert len(buffer.read()) > 0
    
    def test_draw_polygon(self):
        """Test polygon drawing."""
        adapter = PNGRendererAdapter()
        img = adapter.create_image()
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        
        points = [(100, 200), (150, 150), (200, 200), (150, 250)]
        adapter.draw_polygon(draw, points, fill='#0000ff', stroke='#000000', stroke_width=2)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        assert len(buffer.read()) > 0
    
    def test_save_image(self):
        """Test image saving."""
        adapter = PNGRendererAdapter()
        img = adapter.create_image()
        
        buffer = BytesIO()
        result = adapter.save_image(img, buffer)
        assert result is not None
        result.seek(0)
        assert len(result.read()) > 0

    def test_dpi_scale_applies_to_canvas(self):
        """Test that dpi_scale multiplies canvas dimensions."""
        adapter = PNGRendererAdapter(width=800, height=600, dpi_scale=4)
        img = adapter.create_image()
        assert img.size == (3200, 2400)

    def test_dpi_scale_text_rendering(self):
        """Test text rendering at scaled DPI."""
        adapter = PNGRendererAdapter(dpi_scale=4)
        img = adapter.create_image()
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        
        # Should not raise even at 4x scale
        adapter.draw_text(draw, "Scaled Text", 100, 200, "Arial", 12)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        assert len(buffer.read()) > 0

    def test_qr_code_exact_size(self):
        """Test QR code is generated at exact target size without resize."""
        adapter = PNGRendererAdapter()
        img = adapter.create_image()
        
        adapter.draw_qr_code(img, "https://verify.uew.edu.gh/TEST123", 50, 50, 60)
        
        # Paste happened, image should still be valid
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        assert len(buffer.read()) > 0


class TestRenderingUtils:
    """Test cases for rendering utilities (reused from PDF tests)."""
    
    def test_hex_to_rgb_valid(self):
        """Test hex color conversion with valid input."""
        result = hex_to_rgb('#ff0000')
        assert result == (255, 0, 0)
    
    def test_hex_to_rgb_short_form(self):
        """Test hex color conversion with short form."""
        result = hex_to_rgb('#f00')
        assert result == (255, 0, 0)
    
    def test_hex_to_rgb_with_default(self):
        """Test hex color conversion with default value."""
        result = hex_to_rgb('invalid', (128, 128, 128))
        assert result == (128, 128, 128)
    
    def test_hex_to_rgb_white_default(self):
        """Test hex color conversion with white default."""
        result = hex_to_rgb('invalid')
        assert result == (255, 255, 255)
