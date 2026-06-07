# ADR 002: Service Layer for Business Logic

## Status
Accepted

## Context
Business logic was embedded in Django REST Framework views, leading to:
- Fat views with mixed concerns (HTTP handling, validation, business logic)
- Difficulty reusing business logic across different endpoints
- Hard to test business logic without HTTP context
- Violation of Single Responsibility Principle

## Decision
Implement a Service Layer to encapsulate business logic separate from presentation and data access.

### Implementation Details
- Create service classes for each domain (AccountLifecycleService, TwoPersonDeactivationService, etc.)
- Services use repositories for data access
- Services contain business rules and orchestration
- Views delegate to services for business operations
- Services are stateless and can be instantiated per request

### Benefits
- Separation of concerns: views handle HTTP, services handle business logic
- Reusability: business logic can be used by multiple views or other services
- Testability: services can be tested without HTTP context
- Maintainability: business logic is centralized and easier to update

### Examples
```python
# Before (business logic in view)
def post(self, request):
    user = User.objects.create_user(...)
    profile = UserProfile.objects.create(...)
    # ... more business logic
    
# After (service layer)
def post(self, request):
    profile, token = self.lifecycle_service.provision_account(...)
```

## Consequences
- Positive: Cleaner separation of concerns
- Positive: Reusable business logic
- Positive: Easier testing
- Negative: Additional layer of indirection
- Negative: More files to maintain

## Related Decisions
- ADR 001: Repository Pattern for Data Access
