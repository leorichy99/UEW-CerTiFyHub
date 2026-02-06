from django.db import models

class CertificateTemplate(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    background_image = models.ImageField(upload_to='templates/backgrounds/', null=True, blank=True)
    
    # Store dimensions to render correctly on frontend/backend
    canvas_width = models.IntegerField(default=800)
    canvas_height = models.IntegerField(default=600)
    
    # Stores the Konva JSON state (nodes: [{attrs...}, ...])
    metadata = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
