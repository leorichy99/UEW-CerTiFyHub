from django.db import models
from django.contrib.auth.models import User
import uuid
from django.utils.dateparse import parse_date

class Certificate(models.Model):
    DEGREE_CHOICES = [
        ('BSC', 'Bachelor of Science'),
        ('BA', 'Bachelor of Arts'),
        ('BED', 'Bachelor of Education'),
        ('MSC', 'Master of Science'),
        ('MA', 'Master of Arts'),
        ('PHD', 'Doctor of Philosophy'),
        ('BBA', 'Bachelor of Business Administration'),
        ('MPHIL', 'Master of Philosophy'),
        ('MED', 'Master of Education'),
        ('MBA', 'Master of Business Administration'),
    ]
    
    HONORS_CHOICES = [
        ('FIRST', 'FIRST CLASS HONOURS'),
        ('SECOND_UPPER', 'SECOND CLASS HONOURS (Upper Division)'),
        ('SECOND_LOWER', 'SECOND CLASS HONOURS (Lower Division)'),
        ('THIRD', 'THIRD CLASS HONOURS'),
        ('PASS', 'PASS'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, null=True, blank=True)
    template = models.ForeignKey('templates.CertificateTemplate', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, default='ISSUED', choices=[('ISSUED', 'Issued'), ('REVOKED', 'Revoked')])
    
    student_name = models.CharField(max_length=255)
    degree_type = models.CharField(max_length=10, choices=DEGREE_CHOICES)
    honors = models.CharField(max_length=20, choices=HONORS_CHOICES)
    program = models.CharField(max_length=255)
    date_awarded = models.DateField()
    
    university_logo = models.ImageField(upload_to='logos/', null=True, blank=True)
    vc_signature = models.ImageField(upload_to='signatures/', null=True, blank=True)
    registrar_signature = models.ImageField(upload_to='signatures/', null=True, blank=True)
    
    PAPER_SIZE_CHOICES = [
        ('A4', 'A4 (210 × 297 mm)'),
        ('LETTER', 'Letter (8.5 × 11 in)'),
        ('A3', 'A3 (297 × 420 mm)'),
    ]

    paper_size = models.CharField(max_length=10, choices=PAPER_SIZE_CHOICES, default='A4', blank=True)
    certificate_number = models.CharField(max_length=50, unique=True, blank=True)
    generated_date = models.DateTimeField(auto_now_add=True)
    pdf_file = models.FileField(upload_to='certificates/', null=True, blank=True)
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        ordering = ['-generated_date']
        verbose_name = 'Certificate'
        verbose_name_plural = 'Certificates'
    
    def __str__(self):
        return f"{self.student_name} - {self.get_degree_type_display()}"
    
    def save(self, *args, **kwargs):
        if isinstance(self.date_awarded, str):
            parsed = parse_date(self.date_awarded)
            if parsed:
                self.date_awarded = parsed
        if not self.certificate_number:
            year = self.date_awarded.year if self.date_awarded else 2026
            self.certificate_number = f"UEW/{year}/{str(uuid.uuid4())[:8].upper()}"
        super().save(*args, **kwargs)