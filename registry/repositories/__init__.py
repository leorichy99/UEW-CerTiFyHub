"""Repositories for the registry app — encapsulate data access by aggregate."""

from .faculty_repository import FacultyRepository, DepartmentRepository
from .session_repository import CongregationSessionRepository
from .student_record_repository import StudentRecordRepository
from .import_batch_repository import ImportBatchRepository
from .audit_log_repository import ConfirmationAuditLogRepository, EmailDeliveryLogRepository
from .congregation_repository import CongregationRepository

__all__ = [
    'FacultyRepository',
    'DepartmentRepository',
    'CongregationSessionRepository',
    'StudentRecordRepository',
    'ImportBatchRepository',
    'ConfirmationAuditLogRepository',
    'EmailDeliveryLogRepository',
    'CongregationRepository',
]
