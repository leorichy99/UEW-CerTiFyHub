from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from core.models import UserProfile


class Command(BaseCommand):
    help = 'Provision a superuser with a UserProfile for system access'

    def add_arguments(self, parser):
        parser.add_argument(
            'username',
            type=str,
            help='Username of the superuser to provision'
        )

    def handle(self, *args, **options):
        username = options['username']
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" does not exist')

        if not user.is_superuser:
            raise CommandError(f'User "{username}" is not a superuser')

        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'role': 'SUPER_ADMIN',
                'first_login_completed': True,
                'credential_status': 'completed',
            }
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ UserProfile created for {username} with SUPER_ADMIN role'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'UserProfile already exists for {username}'
                )
            )
