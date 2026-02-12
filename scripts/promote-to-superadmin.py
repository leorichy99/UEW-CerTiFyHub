#!/usr/bin/env python
"""
Promote existing user to Super Admin for Django admin access
Run this from your Django project root where manage.py is located
"""

import os
import sys
import django

# Add project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_root)

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_project.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def promote_user_to_superadmin():
    """Promote sadmin@uew.edu.gh to Super Admin"""
    email = 'sadmin@uew.edu.gh'
    password = 'sadmin@26'
    
    try:
        # Find user by email or username
        user = User.objects.get(email=email)
        print(f"✅ Found user: {user.email}")
        
        # Promote to superuser and staff
        user.is_staff = True
        user.is_superuser = True
        user.role = 'SUPER_ADMIN'  # If you have a custom role field
        user.save()
        
        print(f"✅ Promoted {user.email} to Super Admin")
        print(f"   Is staff: {user.is_staff}")
        print(f"   Is superuser: {user.is_superuser}")
        print(f"   Role: {getattr(user, 'role', 'N/A')}")
        
        # Verify password is set correctly
        if user.check_password(password):
            print(f"✅ Password verified")
        else:
            print(f"⚠️  Password verification failed, resetting...")
            user.set_password(password)
            user.save()
            print(f"✅ Password reset")
        
        print(f"\n🎉 You can now log in to Django admin:")
        print(f"   URL: http://localhost:8000/admin")
        print(f"   Username: {email}")
        print(f"   Password: {password}")
        
    except User.DoesNotExist:
        print(f"❌ User {email} not found")
        print(f"   Run the create-superadmin.js script first")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

if __name__ == '__main__':
    print("🔐 Promoting User to Super Admin")
    print("=" * 40)
    promote_user_to_superadmin()
