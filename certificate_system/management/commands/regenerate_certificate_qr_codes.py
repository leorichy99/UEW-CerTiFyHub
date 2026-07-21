"""
Management command to regenerate QR codes for all certificates using verification_token.

This command is idempotent and can be run multiple times safely.
It processes certificates in batches and logs progress to stdout.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from certificates.models import Certificate
from analytics.utils import log_audit
from django.utils import timezone
import sys


class Command(BaseCommand):
    help = 'Regenerate QR codes for all certificates using verification_token'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of certificates to process per batch (default: 100)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would be done without actually regenerating',
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        dry_run = options['dry_run']

        self.stdout.write(self.style.SUCCESS('Starting QR code regeneration...'))
        self.stdout.write(f'Batch size: {batch_size}')
        self.stdout.write(f'Dry run: {dry_run}')

        # Get total count
        total_count = Certificate.objects.filter(verification_token__isnull=False).count()
        self.stdout.write(f'Total certificates with verification_token: {total_count}')

        if total_count == 0:
            self.stdout.write(self.style.WARNING('No certificates with verification_token found. Run backfill migration first.'))
            return

        processed = 0
        skipped = 0

        # Process in batches
        offset = 0
        while offset < total_count:
            batch = Certificate.objects.filter(verification_token__isnull=False)[offset:offset + batch_size]
            
            for cert in batch:
                if not cert.verification_token:
                    self.stdout.write(f'Skipping certificate {cert.id} - no verification_token')
                    skipped += 1
                    continue

                if dry_run:
                    self.stdout.write(f'[DRY RUN] Would regenerate QR for certificate {cert.id} ({cert.certificate_number})')
                    processed += 1
                else:
                    try:
                        with transaction.atomic():
                            # Regenerate PDF QR code
                            if cert.pdf_file:
                                # Trigger PDF regeneration by calling the view's generate method
                                from certificates.views import CertificateViewSet
                                viewset = CertificateViewSet()
                                viewset.generate_pdf_for_certificate(cert)
                            
                            # Log audit event
                            log_audit(
                                request=None,
                                user=None,
                                action='QR code regenerated',
                                target=f'{cert.student_name} - {cert.certificate_number}',
                                details=f'Certificate QR code regenerated for {cert.certificate_number}',
                                category='admin',
                            )
                            
                            processed += 1
                            
                            if processed % 10 == 0:
                                self.stdout.write(f'Processed {processed}/{total_count} certificates...')
                    
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'Error regenerating QR for certificate {cert.id}: {str(e)}'))
                        skipped += 1

            offset += batch_size

        self.stdout.write(self.style.SUCCESS(f'\nRegeneration complete!'))
        self.stdout.write(f'Processed: {processed}')
        self.stdout.write(f'Skipped: {skipped}')
        self.stdout.write(f'Total: {total_count}')
