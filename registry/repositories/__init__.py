"""Repositories for the registry app — encapsulate data access by aggregate."""

from .faculty_repository import FacultyRepository, DepartmentRepository
from .batch_repository import IssuanceBatchRepository
from .student_record_repository import StudentRecordRepository
from .import_batch_repository import ImportBatchRepository
from .audit_log_repository import ConfirmationAuditLogRepository, EmailDeliveryLogRepository

__all__ = [
    'FacultyRepository',
    'DepartmentRepository',
    'IssuanceBatchRepository',
    'StudentRecordRepository',
    'ImportBatchRepository',
    'ConfirmationAuditLogRepository',
    'EmailDeliveryLogRepository',
]
