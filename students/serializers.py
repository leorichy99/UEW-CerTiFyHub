from rest_framework import serializers
from .models import Student

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'

class BulkStudentSerializer(serializers.Serializer):
    """Accepts a list of student data for bulk creation"""
    students = serializers.ListField(
        child=serializers.DictField()
    )
    
    def create(self, validated_data):
        students_data = validated_data.get('students', [])
        created_students = []
        
        for student_data in students_data:
            student, _ = Student.objects.get_or_create(
                student_id=student_data['student_id'],
                defaults=student_data
            )
            created_students.append(student)
        
        return created_students
