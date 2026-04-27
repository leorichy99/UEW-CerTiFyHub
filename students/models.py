from django.db import models

class Student(models.Model):
    DEGREE_CHOICES = [
        ('BED', 'Bachelor of Education'),
        ('BA', 'Bachelor of Arts'),
        ('BSC', 'Bachelor of Science'),
        ('BBA', 'Bachelor of Business Administration'),
        ('MPHIL', 'Master of Philosophy'),
        ('MED', 'Master of Education'),
        ('MBA', 'Master of Business Administration'),
        ('MA', 'Master of Arts'),
        ('PHD', 'Doctor of Philosophy'),
    ]

    HONORS_CHOICES = [
        ('FIRST', 'FIRST CLASS HONOURS'),
        ('SECOND_UPPER', 'SECOND CLASS HONOURS (Upper Division)'),
        ('SECOND_LOWER', 'SECOND CLASS HONOURS (Lower Division)'),
        ('THIRD', 'THIRD CLASS HONOURS'),
        ('PASS', 'PASS'),
    ]

    student_id = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    program = models.CharField(max_length=255)
    graduation_date = models.DateField()
    degree_type = models.CharField(max_length=10, choices=DEGREE_CHOICES, default='BSC', blank=True)
    honors = models.CharField(max_length=20, choices=HONORS_CHOICES, default='PASS', blank=True)
    
    # Metadata for filtering (year, class, etc)
    cohort = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"{self.full_name} ({self.student_id})"
