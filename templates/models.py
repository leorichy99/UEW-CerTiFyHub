from django.db import models
from django.contrib.auth.models import User

class CertificateTemplate(models.Model):
    STATUS_CHOICES = [
        ('official', 'Official'),
        ('draft', 'Draft'),
        ('internal', 'Internal'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    background_image = models.ImageField(upload_to='templates/backgrounds/', null=True, blank=True)
    
    # Store dimensions to render correctly on frontend/backend
    canvas_width = models.IntegerField(default=800)
    canvas_height = models.IntegerField(default=600)
    
    # Stores the Konva JSON state (nodes: [{attrs...}, ...])
    metadata = models.JSONField(default=dict)

    # Lock & ownership
    is_locked = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='templates')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
