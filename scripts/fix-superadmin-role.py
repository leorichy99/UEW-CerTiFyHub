#!/usr/bin/env python
"""
Fix Super Admin role for the existing user
Run this from your Django project root where manage.py is located
"""

import os
import sys
import django

# Add project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_root)

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'certificate_system.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def fix_superadmin_role():
    """Update user role to SUPER_ADMIN"""
    email = 'sadmin@uew.edu.gh'
    
    try:
        # Find user by email
        user = User.objects.get(email=email)
        print(f"✅ Found user: {user.email}")
        print(f"   Current role: {getattr(user.profile, 'role', 'N/A') if hasattr(user, 'profile') else 'No profile'}")
        print(f"   Is staff: {user.is_staff}")
        print(f"   Is superuser: {user.is_superuser}")
        
        # Update role in profile if exists
        if hasattr(user, 'profile'):
            user.profile.role = 'SUPER_ADMIN'
            user.profile.save()
            print(f"✅ Updated profile role to SUPER_ADMIN")
        
        # Ensure staff and superuser flags are set
        user.is_staff = True
        user.is_superuser = True
        user.save()
        print(f"✅ Confirmed staff and superuser flags")
        
        # Verify the changes
        user.refresh_from_db()
        print(f"\n🎉 Updated user details:")
        print(f"   Email: {user.email}")
        print(f"   Role: {getattr(user.profile, 'role', 'N/A') if hasattr(user, 'profile') else 'No profile'}")
        print(f"   Is staff: {user.is_staff}")
        print(f"   Is superuser: {user.is_superuser}")
        
        print(f"\n🚀 You can now log in to Super Admin interface:")
        print(f"   Frontend: http://localhost:3000/login")
        print(f"   Django Admin: http://localhost:8000/admin")
        print(f"   Email: {email}")
        print(f"   Password: sadmin@26")
        
    except User.DoesNotExist:
        print(f"❌ User {email} not found")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

if __name__ == '__main__':
    print("🔧 Fixing Super Admin Role")
    print("=" * 40)
    fix_superadmin_role()
