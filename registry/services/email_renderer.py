"""
HTML email rendering utilities.

All outbound student emails render through Django templates and include
a plain-text fallback for clients that do not support HTML.
"""

import re

from django.conf import settings
from django.template.loader import render_to_string


LOGO_PATH = getattr(settings, 'EMAIL_LOGO_PATH', 'media/logos/uew-logo.png')


def _build_logo_url():
    """Build an absolute URL for the UEW logo embedded in emails."""
    base = getattr(settings, 'FRONTEND_URL', '').rstrip('/')
    if not base:
        base = 'http://localhost:5173'
    return f"{base}/{LOGO_PATH}"


def _html_to_plain(html: str) -> str:
    """Crude but effective HTML-to-text fallback for email clients."""
    # Strip <style> blocks
    text = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.S | re.I)
    # Replace <br>, <p>, etc. with newlines
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.I)
    text = re.sub(r'</p>', '\n\n', text, flags=re.I)
    text = re.sub(r'</li>', '\n', text, flags=re.I)
    # Strip remaining tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode entities
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&')
    text = text.replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&#128712;', '')
    # Collapse excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()


def render_email(template_name: str, context: dict) -> tuple[str, str, str]:
    """
    Render a Django HTML email template.

    Returns:
        (subject, html_body, plain_text_body)
    """
    ctx = context.copy()
    ctx.setdefault('logo_url', _build_logo_url())

    html_body = render_to_string(template_name, ctx)
    plain_body = _html_to_plain(html_body)

    subject = ctx.get('subject', 'UEW CerTiFyHub')
    return subject, html_body, plain_body
