"""
Celery app configuration for certificate_system.
"""

import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'certificate_system.settings')

app = Celery('certificate_system')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
