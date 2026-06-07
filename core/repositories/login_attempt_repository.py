"""
Repository for LoginAttemptTracker model.

Encapsulates data access logic for login attempt tracking,
which handles account lockout after failed login attempts.
"""

from core.models import LoginAttemptTracker


class LoginAttemptTrackerRepository:
    """
    Repository for LoginAttemptTracker data access operations.
    """
    
    def get_by_email(self, email):
        """Get a tracker by email address."""
        email_hash = LoginAttemptTracker.hash_email(email)
        try:
            return LoginAttemptTracker.objects.get(email_hash=email_hash)
        except LoginAttemptTracker.DoesNotExist:
            return None
    
    def get_by_email_hash(self, email_hash):
        """Get a tracker by email hash."""
        try:
            return LoginAttemptTracker.objects.get(email_hash=email_hash)
        except LoginAttemptTracker.DoesNotExist:
            return None
    
    def create_tracker(self, email):
        """Create a new tracker for an email."""
        email_hash = LoginAttemptTracker.hash_email(email)
        return LoginAttemptTracker.objects.create(email_hash=email_hash)
    
    def get_or_create_tracker(self, email):
        """Get or create a tracker for an email."""
        email_hash = LoginAttemptTracker.hash_email(email)
        tracker, created = LoginAttemptTracker.objects.get_or_create(
            email_hash=email_hash
        )
        return tracker
    
    def unlock_account(self, email):
        """Unlock an account by resetting its tracker."""
        tracker = self.get_by_email(email)
        if tracker:
            tracker.unlock()
            return tracker
        return None
    
    def is_locked(self, email):
        """Check if an account is locked."""
        tracker = self.get_by_email(email)
        return tracker and tracker.is_locked()
    
    def is_permanently_locked(self, email):
        """Check if an account is permanently locked."""
        tracker = self.get_by_email(email)
        return tracker and tracker.is_permanently_locked()
    
    def record_failed_attempt(self, email):
        """Record a failed login attempt."""
        tracker = self.get_or_create_tracker(email)
        tracker.record_failed_attempt()
        return tracker
    
    def record_successful_login(self, email):
        """Record a successful login."""
        tracker = self.get_by_email(email)
        if tracker:
            tracker.record_successful_login()
            return tracker
        return None
