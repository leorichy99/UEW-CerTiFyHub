from django.contrib import admin
from .models import Certificate

@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['student_name', 'degree_type', 'program', 'date_awarded', 'certificate_number', 'generated_date']
    list_filter = ['degree_type', 'honors', 'date_awarded']
    search_fields = ['student_name', 'certificate_number', 'program']
    readonly_fields = ['certificate_number', 'generated_date', 'pdf_file']
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student_name', 'program')
        }),
        ('Degree Details', {
            'fields': ('degree_type', 'honors', 'date_awarded')
        }),
        ('Documents', {
            'fields': ('university_logo', 'vc_signature', 'registrar_signature')
        }),
        ('Generated Information', {
            'fields': ('certificate_number', 'generated_date', 'pdf_file'),
            'classes': ('collapse',)
        }),
    )