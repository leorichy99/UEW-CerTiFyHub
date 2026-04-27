"""
Font Manager — registers bundled TTF fonts with ReportLab and provides
path/name lookups keyed by the same family names used in the frontend
@font-face rules (index.css) and template JSON.

Architecture:
  - Fonts live in <project>/fonts/
  - BUNDLED_FONTS maps (family, bold, italic) → filename
  - On module load, every font file is registered with ReportLab's pdfmetrics
  - get_font_path() returns the absolute .ttf path for Pillow (preview)
  - get_pdf_font_name() returns the ReportLab registered name for PDF rendering
"""

import os
import logging
from pathlib import Path

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logger = logging.getLogger(__name__)

FONT_DIR = Path(__file__).resolve().parent.parent / "fonts"

# ── Static registry ───────────────────────────────────────────────
# Each entry: (css_family, bold, italic) → filename in FONT_DIR
# The css_family strings MUST match the @font-face font-family names
# in src/index.css **and** the BUNDLED_FONTS array in TemplateEditor.jsx.
BUNDLED_FONTS: dict[tuple[str, bool, bool], str] = {
    # Baskervville
    ("Baskervville", False, False): "Baskervville-Regular.ttf",
    ("Baskervville", False, True):  "Baskervville-Italic.ttf",
    ("Baskervville", True,  False): "Baskervville-Regular.ttf",   # no bold variant, fallback
    ("Baskervville", True,  True):  "Baskervville-Italic.ttf",    # no bold-italic, fallback

    # EB Garamond
    ("EB Garamond", False, False): "EBGaramond-Regular.ttf",
    ("EB Garamond", False, True):  "EBGaramond-Italic.ttf",
    ("EB Garamond", True,  False): "EBGaramond-Regular.ttf",      # fallback
    ("EB Garamond", True,  True):  "EBGaramond-Italic.ttf",       # fallback

    # Dancing Script (single weight)
    ("Dancing Script", False, False): "Dancing Script.ttf",
    ("Dancing Script", True,  False): "Dancing Script.ttf",
    ("Dancing Script", False, True):  "Dancing Script.ttf",
    ("Dancing Script", True,  True):  "Dancing Script.ttf",

    # William Duke (single weight)
    ("William Duke", False, False): "William Duke.ttf",
    ("William Duke", True,  False): "William Duke.ttf",
    ("William Duke", False, True):  "William Duke.ttf",
    ("William Duke", True,  True):  "William Duke.ttf",
}

# ── ReportLab registration ────────────────────────────────────────
# Maps filename → registered ReportLab font name (so we register each
# .ttf only once even if it appears in multiple bold/italic combos).
_rl_registered: dict[str, str] = {}


def _register_all():
    """Register every bundled font file with ReportLab pdfmetrics."""
    seen_files: set[str] = set()
    for (family, bold, italic), filename in BUNDLED_FONTS.items():
        if filename in seen_files:
            continue
        seen_files.add(filename)

        filepath = FONT_DIR / filename
        if not filepath.exists():
            logger.warning("Bundled font file missing: %s", filepath)
            continue

        # ReportLab name — readable, unique per file
        rl_name = filename.replace(".ttf", "").replace(" ", "_")
        try:
            if rl_name not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont(rl_name, str(filepath)))
            _rl_registered[filename] = rl_name
        except Exception as exc:
            logger.warning("Failed to register font %s with ReportLab: %s", filename, exc)


_register_all()


# ── Public API ────────────────────────────────────────────────────

def get_font_path(family: str, bold: bool = False, italic: bool = False) -> str | None:
    """Return the absolute filesystem path for a bundled font (for Pillow)."""
    if not family:
        return None
    filename = BUNDLED_FONTS.get((family, bold, italic))
    if not filename:
        # Fallback: try regular weight
        filename = BUNDLED_FONTS.get((family, False, False))
    if not filename:
        return None
    path = str(FONT_DIR / filename)
    return path if os.path.exists(path) else None


def get_pdf_font_name(family: str, bold: bool = False, italic: bool = False) -> str | None:
    """Return the ReportLab-registered font name for PDF rendering."""
    if not family:
        return None
    filename = BUNDLED_FONTS.get((family, bold, italic))
    if not filename:
        filename = BUNDLED_FONTS.get((family, False, False))
    if not filename:
        return None
    return _rl_registered.get(filename)
