"""
Management command to fix corrupted template elements.

Identifies and removes text elements with dangerously large font sizes
(e.g. the ghost {program} element with fontSize ~608px) that cause
certificate rendering to produce giant solid watermarks.

Usage:
    python manage.py fix_corrupted_templates [--dry-run]
"""

from django.core.management.base import BaseCommand
from templates.models import CertificateTemplate


class Command(BaseCommand):
    help = "Remove corrupted template elements with runaway font sizes"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be changed without modifying the database",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        templates = CertificateTemplate.objects.all()
        total_fixed = 0
        total_checked = 0

        for tmpl in templates:
            metadata = tmpl.metadata or {}
            elements_by_preset = metadata.get("elements_by_preset") or {}
            changed = False
            report_lines = []

            for preset_id, elements in elements_by_preset.items():
                to_remove = []
                for idx, el in enumerate(elements):
                    if not isinstance(el, dict):
                        continue
                    font_size = el.get("fontSize", 0)
                    width = el.get("width", 0)
                    text = el.get("text", "")
                    el_id = el.get("id", f"index-{idx}")

                    # Detect corruption: fontSize > 200 OR fontSize > 50 with tiny width
                    if font_size > 200 or (font_size > 50 and 0 < width < 150):
                        to_remove.append(idx)
                        report_lines.append(
                            f'  [{preset_id}] Will REMOVE el-{el_id} (text="{text}", '
                            f"fontSize={font_size:.1f}px, width={width:.1f}px)"
                        )

                # Remove in reverse order to preserve indices
                for idx in reversed(to_remove):
                    removed = elements.pop(idx)
                    changed = True
                    self.stdout.write(
                        f"Template '{tmpl.name}' (id={tmpl.id}): removing corrupted element "
                        f"'{removed.get('text', '')}' (fontSize={removed.get('fontSize', 0):.1f})"
                    )

            # Also check legacy flat `elements` array if present
            flat_elements = metadata.get("elements")
            if isinstance(flat_elements, list):
                flat_to_remove = []
                for idx, el in enumerate(flat_elements):
                    if not isinstance(el, dict):
                        continue
                    font_size = el.get("fontSize", 0)
                    width = el.get("width", 0)
                    text = el.get("text", "")

                    if font_size > 200 or (font_size > 50 and 0 < width < 150):
                        flat_to_remove.append(idx)
                        report_lines.append(
                            f'  [legacy] Will REMOVE el-{el.get("id", idx)} (text="{text}", '
                            f"fontSize={font_size:.1f}px, width={width:.1f}px)"
                        )

                for idx in reversed(flat_to_remove):
                    removed = flat_elements.pop(idx)
                    changed = True
                    self.stdout.write(
                        f"Template '{tmpl.name}' (id={tmpl.id}): removing corrupted element "
                        f"'{removed.get('text', '')}' (fontSize={removed.get('fontSize', 0):.1f})"
                    )

            if changed:
                total_fixed += 1
                if not dry_run:
                    tmpl.metadata = metadata
                    tmpl.save(update_fields=["metadata"])
                    self.stdout.write(
                        self.style.SUCCESS(f"  Saved cleaned template '{tmpl.name}'")
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f"  [DRY RUN] Would save template '{tmpl.name}'")
                    )

            total_checked += 1

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"\nDRY RUN complete. Checked {total_checked} templates, "
                    f"{total_fixed} would be fixed."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nDone. Checked {total_checked} templates, fixed {total_fixed}."
                )
            )
