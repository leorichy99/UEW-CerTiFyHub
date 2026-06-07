# ADR 003: Authorization Service with Rule Registration

## Status
Accepted

## Context
The codebase had authorization logic scattered across permission classes and helper functions:
- Permission classes contained business logic mixed with authorization checks
- Hard to add new authorization rules without modifying multiple files
- No centralized place to manage authorization policies
- Difficult to test authorization logic in isolation

## Decision
Implement a centralized Authorization Service with a rule registration system.

### Implementation Details
- Create AuthorizationService class with rule registration methods
- Default rules registered for common checks (is_authenticated, is_super_admin, etc.)
- Custom rules can be registered at runtime
- Permission classes delegate to the authorization service
- Support for AND/OR logic across multiple rules

### Benefits
- Centralized authorization logic management
- Easy to add new authorization rules
- Testable authorization logic without HTTP context
- Flexible rule composition (AND/OR logic)
- Clear separation between authorization and permission classes

### Examples
```python
# Register custom rule
auth_service.register_rule('is_department_head', lambda user, ctx: (
    user.profile.department == ctx['target_department']
))

# Check rule
if auth_service.check_rule('is_department_head', user, {'target_department': 'CS'}):
    # Allow access

# Multiple rules (AND logic)
if auth_service.check_all_rules(['is_authenticated', 'is_active'], user):
    # Allow access
```

## Consequences
- Positive: Centralized authorization management
- Positive: Flexible rule system
- Positive: Easy to test
- Negative: Additional abstraction layer
- Negative: Need to learn rule registration API

## Related Decisions
- ADR 001: Repository Pattern for Data Access
- ADR 002: Service Layer for Business Logic
