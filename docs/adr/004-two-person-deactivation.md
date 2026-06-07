# ADR 004: Two-Person Deactivation for Super Admins

## Status
Accepted

## Context
Super Admin accounts have elevated privileges, making their deactivation a security-sensitive operation:
- Single admin could maliciously deactivate other admins
- Risk of accidental deactivation by a compromised account
- No audit trail for who initiated and confirmed deactivations
- System requires at least 2 active Super Admins for redundancy

## Decision
Implement a two-person authorization workflow for Super Admin deactivation.

### Implementation Details
- Create TwoPersonDeactivationService to manage the workflow
- One Super Admin initiates deactivation with a reason
- A different Super Admin must confirm the deactivation
- Confirmation token expires after 24 hours
- Email notifications sent to all other Super Admins
- System enforces minimum of 2 active Super Admins
- Full audit trail of initiation and confirmation

### Benefits
- Prevents unilateral deactivation by a single admin
- Provides audit trail with initiator and confirmer
- Reduces risk of malicious or accidental deactivation
- Maintains system redundancy (minimum 2 active SAs)
- Clear accountability for deactivation decisions

### Workflow
1. Admin A initiates deactivation of Admin B with reason
2. System generates confirmation token (expires in 24h)
3. System emails all other Super Admins with confirmation link
4. Admin C (different from A) clicks link or confirms via UI
5. System deactivates Admin B and logs audit trail

### Examples
```python
# Initiate deactivation
request, token = deactivation_service.initiate_deactivation(
    target_user_id=user_id,
    initiated_by=request.user,
    reason='Security policy violation'
)

# Confirm deactivation
profile = deactivation_service.confirm_deactivation(
    request_id=request.id,
    confirmed_by=confirming_admin,
    confirmation_token=token
)
```

## Consequences
- Positive: Prevents unilateral deactivation
- Positive: Full audit trail
- Positive: Maintains system redundancy
- Negative: Additional step in deactivation process
- Negative: Requires coordination between admins

## Related Decisions
- ADR 001: Repository Pattern for Data Access
- ADR 002: Service Layer for Business Logic
