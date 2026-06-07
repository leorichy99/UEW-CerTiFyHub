"""
Font Manager — registers bundled TTF/OTF fonts with ReportLab and provides
path/name lookups keyed by the same family names used in the frontend
@font-face rules (index.css) and template JSON.

Architecture:
  - Fonts live in <project>/fonts/
  - BUNDLED_FONTS maps (family, bold, italic) → filename
  - On module load, every font file is registered with ReportLab's pdfmetrics
  - get_font_path() returns the absolute font path for Pillow (preview)
  - get_pdf_font_name() returns the ReportLab registered name for PDF rendering
  - OTF fonts with PostScript (CFF) outlines are auto-converted to TTF because
    ReportLab's TTFont does not support PostScript outlines.
"""

import os
import logging
import tempfile
from pathlib import Path

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from fontTools.ttLib import TTFont as FTT, newTable
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

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

    # Blackadder ITC (single weight)
    ("Blackadder ITC", False, False): "Blackadder ITC.ttf",
    ("Blackadder ITC", True,  False): "Blackadder ITC.ttf",
    ("Blackadder ITC", False, True):  "Blackadder ITC.ttf",
    ("Blackadder ITC", True,  True):  "Blackadder ITC.ttf",

    # Helvetica
    ("Helvetica", False, False): "Helvetica.ttf",
    ("Helvetica", True,  False): "Helvetica-Bold.ttf",
    ("Helvetica", False, True):  "Helvetica.ttf",
    ("Helvetica", True,  True):  "Helvetica-Bold.ttf",

    # ITC Zapf Chancery (single weight, OTF)
    ("ITC Zapf Chancery", False, False): "ITC Zapf Chancery Roman.otf",
    ("ITC Zapf Chancery", True,  False): "ITC Zapf Chancery Roman.otf",
    ("ITC Zapf Chancery", False, True):  "ITC Zapf Chancery Roman.otf",
    ("ITC Zapf Chancery", True,  True):  "ITC Zapf Chancery Roman.otf",

    # Roboto
    ("Roboto", False, False): "Roboto-Regular.ttf",
    ("Roboto", True,  False): "Roboto-Bold.ttf",
    ("Roboto", False, True):  "Roboto-Regular.ttf",
    ("Roboto", True,  True):  "Roboto-Bold.ttf",

    # Times New Roman (single weight)
    ("Times New Roman", False, False): "Times New Roman.ttf",
    ("Times New Roman", True,  False): "Times New Roman.ttf",
    ("Times New Roman", False, True):  "Times New Roman.ttf",
    ("Times New Roman", True,  True):  "Times New Roman.ttf",
}

# ── ReportLab registration ────────────────────────────────────────
# Maps filename → registered ReportLab font name (so we register each
# file only once even if it appears in multiple bold/italic combos).
_rl_registered: dict[str, str] = {}

# Cache: original filename → converted TTF temp-file path
_converted_paths: dict[str, str] = {}


def _convert_cff_otf_to_ttf(otf_path: Path) -> str | None:
    """Convert a CFF-based OTF font to TrueType TTF for ReportLab compatibility."""
    try:
        font = FTT(str(otf_path))
        glyph_set = font.getGlyphSet()

        glyf_table = newTable("glyf")
        glyf_table.glyphs = {}
        for glyph_name in font.getGlyphOrder():
            glyph = glyph_set[glyph_name]
            tt_pen = TTGlyphPen(glyph_set)
            cu2qu_pen = Cu2QuPen(tt_pen, max_err=1.0)
            glyph.draw(cu2qu_pen)
            glyf_table.glyphs[glyph_name] = tt_pen.glyph()

        font["glyf"] = glyf_table
        font["loca"] = newTable("loca")

        if "CFF " in font:
            del font["CFF "]
        if "CFF2" in font:
            del font["CFF2"]

        font.sfntVersion = "\x00\x01\x00\x00"

        maxp = newTable("maxp")
        maxp.tableVersion = 1.0
        maxp.numGlyphs = len(font.getGlyphOrder())
        maxp.maxPoints = 0
        maxp.maxContours = 0
        maxp.maxCompositePoints = 0
        maxp.maxCompositeContours = 0
        maxp.maxZones = 1
        maxp.maxTwilightPoints = 0
        maxp.maxStorage = 0
        maxp.maxFunctionDefs = 0
        maxp.maxInstructionDefs = 0
        maxp.maxStackElements = 0
        maxp.maxSizeOfInstructions = 0
        maxp.maxComponentElements = 0
        maxp.maxComponentDepth = 0
        font["maxp"] = maxp

        fd, tmp_path = tempfile.mkstemp(suffix=".ttf", prefix="certfont_")
        os.close(fd)
        font.save(tmp_path)
        return tmp_path
    except Exception as exc:
        logger.warning("Failed to convert OTF font %s to TTF: %s", otf_path, exc)
        return None


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
        rl_name = filename.replace(".ttf", "").replace(".otf", "").replace(" ", "_")
        try:
            if rl_name not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont(rl_name, str(filepath)))
            _rl_registered[filename] = rl_name
        except Exception as exc:
            msg = str(exc).lower()
            if "postscript outlines are not supported" in msg:
                converted = _convert_cff_otf_to_ttf(filepath)
                if converted:
                    pdfmetrics.registerFont(TTFont(rl_name, converted))
                    _rl_registered[filename] = rl_name
                    _converted_paths[filename] = converted
                    logger.info("Converted OTF font %s → TTF for ReportLab", filename)
                else:
                    logger.warning("Failed to register font %s (OTF conversion failed)", filename)
            else:
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
    # Prefer converted TTF if available (ReportLab compatibility)
    path = _converted_paths.get(filename)
    if path and os.path.exists(path):
        return path
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
