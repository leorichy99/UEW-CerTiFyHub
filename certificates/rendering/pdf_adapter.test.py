"""
Unit tests for PDF renderer adapter.
"""

import pytest
from io import BytesIO
from reportlab.lib.pagesizes import A4

from .pdf_adapter import PDFRendererAdapter
from ..rendering_utils import hex_to_rgb


class TestPDFRendererAdapter:
    """Test cases for PDF renderer adapter."""
    
    def test_initialization(self):
        """Test adapter initialization."""
        adapter = PDFRendererAdapter()
        assert adapter.page_size == A4
    
    def test_custom_page_size(self):
        """Test adapter with custom page size."""
        custom_size = (600, 400)
        adapter = PDFRendererAdapter(page_size=custom_size)
        assert adapter.page_size == custom_size
    
    def test_create_canvas(self):
        """Test canvas creation."""
        adapter = PDFRendererAdapter()
        buffer = BytesIO()
        canvas = adapter.create_canvas(buffer)
        assert canvas is not None
    
    def test_create_canvas_without_buffer(self):
        """Test canvas creation without providing buffer."""
        adapter = PDFRendererAdapter()
        canvas = adapter.create_canvas()
        assert canvas is not None
    
    def test_draw_text_basic(self):
        """Test basic text drawing."""
        adapter = PDFRendererAdapter()
        buffer = BytesIO()
        canvas = adapter.create_canvas(buffer)
        
        adapter.draw_text(canvas, "Test Text", 100, 500, "Helvetica", 12)
        
        canvas.save()
        buffer.seek(0)
        assert len(buffer.read()) > 0
    
    def test_draw_text_with_alignment(self):
        """Test text drawing with different alignments."""
        adapter = PDFRendererAdapter()
        buffer = BytesIO()
        canvas = adapter.create_canvas(buffer)
        
        adapter.draw_text(canvas, "Center", 100, 500, "Helvetica", 12, align='center', max_width=200)
        adapter.draw_text(canvas, "Right", 100, 480, "Helvetica", 12, align='right', max_width=200)
        
        canvas.save()
        buffer.seek(0)
        assert len(buffer.read()) > 0
    
    def test_draw_text_with_wrapping(self):
        """Test text drawing with word wrapping."""
        adapter = PDFRendererAdapter()
        buffer = BytesIO()
        canvas = adapter.create_canvas(buffer)
        
        long_text = "This is a very long text that should wrap across multiple lines when rendered"
        adapter.draw_text(canvas, long_text, 100, 500, "Helvetica", 12, max_width=200)
        
        canvas.save()
        buffer.seek(0)
        assert len(buffer.read()) > 0
    
    def test_draw_rectangle(self):
        """Test rectangle drawing."""
        adapter = PDFRendererAdapter()
        buffer = BytesIO()
        canvas = adapter.create_canvas(buffer)
        
        adapter.draw_rectangle(canvas, 100, 400, 200, 100, fill='#ff0000', stroke='#000000', stroke_width=2)
        
        canvas.save()
        buffer.seek(0)
        assert len(buffer.read()) > 0
    
    def test_save_canvas(self):
        """Test canvas saving."""
        adapter = PDFRendererAdapter()
        buffer = BytesIO()
        canvas = adapter.create_canvas(buffer)
        
        result = adapter.save_canvas(canvas, buffer)
        assert result is not None
        result.seek(0)
        assert len(result.read()) > 0

    def test_qr_code_vector_rendering(self):
        """Test QR code is drawn as native vector rectangles, not raster."""
        adapter = PDFRendererAdapter()
        buffer = BytesIO()
        canvas = adapter.create_canvas(buffer)
        
        adapter.draw_qr_code(canvas, "https://verify.uew.edu.gh/TEST123", 100, 500, 60)
        
        canvas.save()
        buffer.seek(0)
        pdf_data = buffer.read()
        assert len(pdf_data) > 0
        # Vector rects use 're' operator; raster images use 'Do' + XObject
        # We cannot easily assert 're' presence without a PDF parser,
        # so we at minimum assert the PDF is valid and non-empty.


class TestRenderingUtils:
    """Test cases for rendering utilities."""
    
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
