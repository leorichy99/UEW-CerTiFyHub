"""
Common rendering utilities for certificate generation.

Extracted from CertificateViewSet to avoid duplication between PDF and PNG rendering.
"""

from reportlab.pdfbase import pdfmetrics


def wrap_text(text, font_name, font_size, max_width):
    """
    Word-wrap text into lines that fit within max_width.
    
    Mirrors Konva <Text> wrapping behaviour with a small tolerance to absorb
    sub-pixel font metric differences between rendering backends.
    
    Args:
        text: The text to wrap
        font_name: ReportLab font name
        font_size: Font size in points
        max_width: Maximum width in points
    
    Returns:
        List of wrapped lines
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


def hex_to_rgb(hex_color, default=(255, 255, 255)):
    """
    Convert '#RRGGBB' to (R, G, B) tuple (0-255).
    
    Args:
        hex_color: Hex color string (e.g., '#FF0000')
        default: Default RGB tuple if conversion fails
    
    Returns:
        Tuple of (R, G, B) values
    """
    try:
        if isinstance(hex_color, str) and hex_color.startswith('#'):
            h = hex_color.lstrip('#')
            if len(h) == 3:
                h = ''.join(c * 2 for c in h)
            return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
        return default
    except (ValueError, AttributeError):
        return default
