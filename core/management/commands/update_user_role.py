from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import UserProfile

class Command(BaseCommand):
    help = 'Update user role to SUPER_ADMIN'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to update')
        parser.add_argument('role', type=str, help='New role (SUPER_ADMIN, ADMIN, STUDENT, EMPLOYER)')

    def handle(self, *args, **options):
        username = options['username']
        new_role = options['role']
        
        try:
            user = User.objects.get(username=username)
            profile = user.profile
            old_role = profile.role
            profile.role = new_role
            profile.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Updated user "{username}" role from "{old_role}" to "{new_role}"'
                )
            )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User "{username}" does not exist')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error updating user role: {e}')
            )
