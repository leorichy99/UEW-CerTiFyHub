# ADR 001: Repository Pattern for Data Access

## Status
Accepted

## Context
The codebase had data access logic scattered across views and services, leading to:
- Tight coupling between business logic and data access
- Difficulty testing business logic in isolation
- Inconsistent data access patterns
- Hard to change data storage implementation

## Decision
Implement the Repository Pattern to encapsulate all data access logic.

### Implementation Details
- Create repository classes for each domain model (UserProfile, AuthorisationReference, etc.)
- Repositories provide CRUD operations and domain-specific queries
- All database interactions go through repositories
- Views and services depend on repository interfaces, not direct model access

### Benefits
- Separation of concerns: business logic separated from data access
- Testability: can mock repositories for unit testing
- Consistency: standardized data access patterns
- Flexibility: easier to swap data storage implementations

### Examples
```python
# Before (direct model access)
user = User.objects.get(id=user_id)
profile = UserProfile.objects.get(user=user)

# After (repository pattern)
profile_repo = UserProfileRepository()
profile = profile_repo.get_by_user_id(user_id)
```

## Consequences
- Positive: Cleaner separation of concerns, easier testing
- Positive: Consistent data access patterns
- Negative: More boilerplate code initially
- Negative: Learning curve for team members unfamiliar with pattern

## Related Decisions
- ADR 002: Service Layer for Business Logic
