from rest_framework import serializers
from .models import Certificate

class CertificateSerializer(serializers.ModelSerializer):
    degree_type_display = serializers.CharField(source='get_degree_type_display', read_only=True)
    honors_display = serializers.CharField(source='get_honors_display', read_only=True)
    batch_id = serializers.UUIDField(source='issuance_batch.id', read_only=True, default=None)
    batch_reference_name = serializers.CharField(source='issuance_batch.reference_name', read_only=True, default=None)
    issuance_run_id = serializers.UUIDField(source='issuance_run.id', read_only=True, default=None)
    index_number = serializers.CharField(source='student_record.index_number', read_only=True, default=None)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, default=None)
    revoked_by_name = serializers.CharField(source='revoked_by.get_full_name', read_only=True, default=None)
    issuance_run_display = serializers.SerializerMethodField()

    def get_issuance_run_display(self, obj):
        if obj.issuance_run:
            return str(obj.issuance_run)
        return None

    class Meta:
        model = Certificate
        fields = [
            'id', 'student_record', 'template', 'status',
            'student_name', 'degree_type', 'degree_type_display',
            'honors', 'honors_display', 'program', 'date_awarded',
            'university_logo', 'vc_signature', 'registrar_signature',
            'paper_size', 'certificate_number', 'generated_date', 'pdf_file',
            'batch_id', 'batch_reference_name', 'issuance_run_id', 'index_number',
            'created_by_name', 'revoked_at', 'revoked_by_name', 'revocation_reason',
            'issuance_run_display',
        ]
        read_only_fields = ['id', 'certificate_number', 'generated_date', 'pdf_file']
        # verification_token is intentionally excluded from fields to prevent exposure in API responses
    
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