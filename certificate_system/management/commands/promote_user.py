from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Promote existing user to Super Admin with staff and superuser privileges'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email of user to promote')

    def handle(self, *args, **options):
        email = options['email']
        
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f'✅ Found user: {user.email}')
            
            # Promote to staff and superuser
            user.is_staff = True
            user.is_superuser = True
            # Set role if your model has this field
            if hasattr(user, 'role'):
                user.role = 'SUPER_ADMIN'
            
            user.save()
            
            self.stdout.write(f'✅ Promoted {user.email} to Super Admin')
            self.stdout.write(f'   Is staff: {user.is_staff}')
            self.stdout.write(f'   Is superuser: {user.is_superuser}')
            if hasattr(user, 'role'):
                self.stdout.write(f'   Role: {user.role}')
            
            self.stdout.write(f'\n🎉 You can now log in to Django admin:')
            self.stdout.write(f'   URL: http://localhost:8000/admin')
            self.stdout.write(f'   Email: {email}')
            self.stdout.write(f'   Password: sadmin@26')
            
        except User.DoesNotExist:
            self.stdout.write(f'❌ User {email} not found')
            self.stdout.write('   Make sure the user exists first via API registration')
        except Exception as e:
            self.stdout.write(f'❌ Error: {e}')
