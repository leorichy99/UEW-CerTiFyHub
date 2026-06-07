from rest_framework import serializers
from .models import CertificateTemplate

class CertificateTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    created_by_initials = serializers.SerializerMethodField()

    class Meta:
        model = CertificateTemplate
        fields = '__all__'
        read_only_fields = ['created_by', 'created_by_name', 'created_by_initials']

    def get_created_by_name(self, obj):
        if obj.created_by:
            full = obj.created_by.get_full_name()
            return full if full.strip() else obj.created_by.username
        return None

    def get_created_by_initials(self, obj):
        if obj.created_by:
            fn = obj.created_by.first_name
            ln = obj.created_by.last_name
            if fn and ln:
                return f"{fn[0]}{ln[0]}".upper()
            return (obj.created_by.username[0:2]).upper()
        return None

    def _sync_canvas_dimensions(self, validated_data):
        metadata = validated_data.get('metadata') or {}
        if isinstance(metadata, str):
            import json
            metadata = json.loads(metadata)
        canvas_meta = metadata.get('canvas') or {}
        if canvas_meta.get('width'):
            validated_data['canvas_width'] = int(canvas_meta['width'])
        if canvas_meta.get('height'):
            validated_data['canvas_height'] = int(canvas_meta['height'])
        return validated_data

    def create(self, validated_data):
        validated_data = self._sync_canvas_dimensions(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._sync_canvas_dimensions(validated_data)
        return super().update(instance, validated_data)
