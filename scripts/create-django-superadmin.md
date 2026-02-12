# Create Django Super Admin

## Option 1: Django Management Command
```bash
cd your-django-project
python manage.py createsuperuser --username sadmin --email sadmin@uew.edu.gh
# When prompted for password, enter: sadmin@26
```

## Option 2: Django Shell
```bash
cd your-django-project
python manage.py shell
```

Then run:
```python
from django.contrib.auth import get_user_model
User = get_user_model()

# Create or get existing user
user, created = User.objects.get_or_create(
    username='sadmin@uew.edu.gh',
    defaults={
        'email': 'sadmin@uew.edu.gh',
        'full_name': 'Super Admin',
        'is_staff': True,
        'is_superuser': True,
    }
)

# Set password
user.set_password('sadmin@26')
user.save()

print(f"User {'created' if created else 'updated'}: {user.email}")
print(f"Is staff: {user.is_staff}")
print(f"Is superuser: {user.is_superuser}")
```

## After Creation
1. Go to: http://localhost:8000/admin
2. Login: sadmin@uew.edu.gh / sadmin@26
3. Find the existing user and promote them if needed
