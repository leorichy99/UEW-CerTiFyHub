from rest_framework import serializers
from .models import Certificate

class CertificateSerializer(serializers.ModelSerializer):
    degree_type_display = serializers.CharField(source='get_degree_type_display', read_only=True)
    honors_display = serializers.CharField(source='get_honors_display', read_only=True)
    
    class Meta:
        model = Certificate
        fields = [
            'id', 'student_record', 'template', 'status',
            'student_name', 'degree_type', 'degree_type_display',
            'honors', 'honors_display', 'program', 'date_awarded',
            'university_logo', 'vc_signature', 'registrar_signature',
            'paper_size', 'certificate_number', 'generated_date', 'pdf_file'
        ]
        read_only_fields = ['id', 'certificate_number', 'generated_date', 'pdf_file']
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')

        # Make image URLs absolute; be defensive in case of missing storage or request
        try:
            if instance.university_logo and request:
                representation['university_logo'] = request.build_absolute_uri(instance.university_logo.url)
        except Exception:
            representation['university_logo'] = None

        try:
            if instance.vc_signature and request:
                representation['vc_signature'] = request.build_absolute_uri(instance.vc_signature.url)
        except Exception:
            representation['vc_signature'] = None

        try:
            if instance.registrar_signature and request:
                representation['registrar_signature'] = request.build_absolute_uri(instance.registrar_signature.url)
        except Exception:
            representation['registrar_signature'] = None

        try:
            if instance.pdf_file and request:
                representation['pdf_file'] = request.build_absolute_uri(instance.pdf_file.url)
        except Exception:
            representation['pdf_file'] = None

        return representation