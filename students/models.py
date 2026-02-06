from django.db import models

class Student(models.Model):
    student_id = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    program = models.CharField(max_length=255)
    graduation_date = models.DateField()
    
    # Metadata for filtering (year, class, etc)
    cohort = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"{self.full_name} ({self.student_id})"
