# PRD: Architectural Improvements for UEW CerTiFyHub

## Problem Statement

The UEW CerTiFyHub codebase has accumulated architectural friction points that reduce maintainability, testability, and developer productivity:

1. **Certificate rendering logic** is embedded in a 61KB ViewSet with duplicated text wrapping, font management, and PDF/PNG generation code spread across 20+ static methods
2. **Account lifecycle operations** (provision, deactivate, reactivate, unlock, credential regeneration) are scattered across multiple API views with inline business logic, making it difficult to enforce consistent policies and test state transitions
3. **Authorization checks** are duplicated across DRF permission classes and inline view checks, with no centralized policy engine for granular permission evaluation
4. **Editor history management** is tightly coupled to the EditorContext component, making it difficult to test undo/redo logic in isolation or reuse history management across different editor instances
5. **Data fetching logic** is repeated across page components with inline state management, refresh handling, and error handling, leading to inconsistent patterns and duplicated code
6. **Test infrastructure** lacks organized fixtures, factories, and mocks, making it difficult to write reliable tests and maintain test data across the codebase

These friction points increase the cognitive load for developers, make it harder to onboard new team members, and increase the risk of bugs when making changes to core functionality.

## Solution

Extract deep, testable modules that encapsulate complex logic behind simple, stable interfaces:

1. **Certificate Rendering Module**: Extract PDF/PNG rendering logic into a service layer with adapter pattern for different output formats, shared common utilities for text wrapping and placeholder replacement
2. **Account Lifecycle Service**: Consolidate account state transitions into a domain service with repository pattern for data access, separate two-person deactivation flow as composed service
3. **Authorization Policy Module**: Centralize permission evaluation in a service with decorator-based rule registration, DRF permission classes delegate to service for consistency
4. **Editor History Module**: Extract history management into a pure HistoryManager class with React hook wrapper, supporting per-preset instances, configurable stack limits, and eviction hooks
5. **API Hooks Module**: Create generic React Query-based hooks for data fetching and mutations, with page-specific wrappers for domain language
6. **Test Surface Seam**: Establish organized test infrastructure with fixtures, factories (hybrid factory_boy + custom), MSW mocks per feature, and test utilities

Each module follows the deep module principle: encapsulates significant functionality behind a simple, testable interface that rarely changes.

## User Stories

### Certificate Rendering Module

1. As a developer, I want to extract certificate rendering logic into a separate module, so that I can test PDF and PNG generation in isolation without loading the entire ViewSet
2. As a developer, I want shared text wrapping and placeholder replacement utilities, so that PDF and PNG renderers produce consistent output
3. As a developer, I want a service layer with a single `render(certificate, format)` entry point, so that I can easily add new output formats in the future
4. As a developer, I want adapter classes for PDF and PNG rendering with instance-level font caches, so that rendering performance is optimized and font loading is centralized
5. As a developer, I want domain exceptions for rendering errors, so that the ViewSet can map them to appropriate HTTP responses
6. As a developer, I want a Django app config factory for service instantiation, so that I can inject mock services in tests
7. As a developer, I want unit tests for rendering adapters and integration tests for the service, so that I have confidence in rendering correctness

### Account Lifecycle Service

1. As a developer, I want all account state transitions in a single service, so that I can enforce consistent business rules across operations
2. As a developer, I want repository classes for User, Profile, and AuthorisationReference with domain-specific methods, so that data access logic is abstracted from business logic
3. As a developer, I want a separate TwoPersonDeactivationService for Super Admin deactivation flow, so that complex approval logic is isolated and testable
4. As a developer, I want DTOs for service return types (e.g., `AccountProvisioned`), so that service responses are well-typed and self-documenting
5. As a developer, I want domain exceptions for account lifecycle errors, so that views can map them to appropriate HTTP responses
6. As a developer, I want transaction management with `@transaction.atomic` in service methods, so that state transitions are atomic and consistent
7. As a developer, I want unit tests with mock repositories and integration tests with real database, so that I have confidence in service correctness

### Authorization Policy Module

1. As a developer, I want a centralized AuthorizationService, so that permission evaluation is consistent across the application
2. As a developer, I want decorator-based rule registration, so that adding new permissions is declarative and discoverable
3. As a developer, I want resource-aware permission checks, so that I can implement ownership-based access control
4. As a developer, I want configurable Super Admin bypass and account expiry checking, so that authorization behavior is flexible and testable
5. As a developer, I want DRF permission classes that delegate to the service, so that existing permission patterns continue to work while using the centralized engine
6. As a developer, I want domain/infrastructure split, so that authorization logic is pure and testable independent of Django
7. As a developer, I want unit tests for permission rules and integration tests for DRF integration, so that I have confidence in authorization correctness

### Editor History Module

1. As a developer, I want a pure HistoryManager class, so that I can test undo/redo logic without React
2. As a developer, I want a React hook wrapper `useEditorHistory`, so that history management integrates cleanly with React components
3. As a developer, I want per-preset history instances, so that each canvas preset maintains its own undo/redo stack
4. As a developer, I want configurable stack limits with eviction hooks, so that I can control memory usage and observe when history is evicted
5. As a developer, I want configurable cloning strategy (default: element-aware shallow clone), so that history copying is flexible and performant
6. As a developer, I want unit tests for the HistoryManager class and integration tests for the hook, so that I have confidence in history correctness

### API Hooks Module

1. As a developer, I want generic `useApiQuery` and `useApiMutation` hooks, so that I don't repeat data fetching logic across components
2. As a developer, I want React Query integration with caching, so that API calls are efficient and data is fresh
3. As a developer, I want page-specific hooks (e.g., `useDashboardStats`), so that domain language is preserved and hooks are self-documenting
4. As a developer, I want a global QueryClient with optional subtree providers, so that most of the app uses standard caching while special cases can customize behavior
5. As a developer, I want unit tests for generic hooks and integration tests for page-specific hooks, so that I have confidence in hook correctness

### Test Surface Seam

1. As a developer, I want organized fixtures, factories, and mocks, so that test data is discoverable and maintainable
2. As a developer, I want model fixtures for backend tests and API fixtures for frontend tests, so that test data matches the domain
3. As a developer, I want hybrid factory pattern (factory_boy for complex models, custom for simple), so that I have the right tool for each use case
4. As a developer, I want MSW mocks organized by feature, so that API mocking is easy to find and maintain
5. As a developer, I want test utilities for assertions and setup, so that common test patterns are reusable
6. As a developer, I want a custom test client wrapper with auth and CRUD helpers, so that backend tests are concise and readable
7. As a developer, I want both fixtures and builders for test data, so that I can use pre-canned scenarios for common cases and dynamic builders for specific needs

## Implementation Decisions

### Certificate Rendering Module

- **Entry point**: `render(certificate, format=RenderFormat.PDF)` with enum for format type (PDF, PNG)
- **Service layer**: `CertificateRenderingService.render(certificate, format)` returns `Union[File, bytes]`
- **Adapters**: `PDFRenderer` and `PNGRenderer` classes with `render(certificate) -> bytes` method
- **Common utilities**: Text wrapping, placeholder replacement, color extraction in `rendering/utils/` (shared by both adapters)
- **Font management**: Instance-level font caches in adapters (not shared across instances)
- **Error handling**: Domain exceptions (`RenderingError`, `FontLoadError`) raised by adapters, mapped to HTTP responses by ViewSet
- **File structure**: `certificates/rendering/renderers/pdf.py`, `certificates/rendering/renderers/png.py`, `certificates/rendering/utils/`
- **Dependency injection**: Django app config factory `get_rendering_service()` for production, constructor injection in ViewSets for tests
- **Testing**: Unit tests for adapters (mock Certificate objects), integration tests for service (with real Certificate fixtures)

### Account Lifecycle Service

- **Service interface**: Methods per operation: `provision_account()`, `deactivate_account()`, `reactivate_account()`, `unlock_account()`, `regenerate_credentials()`
- **Return types**: DTOs (e.g., `AccountProvisioned(user, credential_sent)`) with operation metadata
- **Error handling**: Domain exceptions (`AccountProvisionError`, `DeactivationNotAllowedError`) raised by service
- **Transaction management**: Service methods use `@transaction.atomic` decorator
- **Two-person deactivation**: Separate `TwoPersonDeactivationService` composed into `AccountLifecycleService`
- **Repositories**: Three repositories (`UserRepository`, `ProfileRepository`, `AuthReferenceRepository`) with domain-specific methods (e.g., `provision()`, `mark_used()`)
- **File structure**: `core/domain/account_lifecycle.py`, `core/domain/two_person_deactivation.py`, `core/domain/repositories/`, `core/infrastructure/` for Django-specific implementations
- **Dependency injection**: Django app config factory `get_account_lifecycle_service()` for production, constructor injection for tests
- **Testing**: Unit tests with mock repositories, integration tests with real database

### Authorization Policy Module

- **Service interface**: `AuthorizationService.can(user, permission_key, resource=None)` returns `Result[bool, Error]`
- **Rule registration**: Decorator `@register_permission(key)` registers evaluator functions with signature `(user, permission_key, resource=None) -> Result[bool, Error]`
- **DRF integration**: Existing permission classes (`IsSuperAdmin`, `IsActiveAccount`, `HasPermission`) delegate to service
- **Super Admin bypass**: Configurable via `allow_superadmin_bypass` parameter (default True)
- **Account expiry**: Configurable via `check_expiry` parameter (default True)
- **Resource-aware**: Primary interface accepts resource object, fallback accepts resource type + ID
- **File structure**: `core/domain/authorization.py` (service + rules), `core/infrastructure/drf_permissions.py` (DRF permission classes)
- **Dependency injection**: Django app config factory `get_authorization_service()` for production
- **Testing**: Unit tests for permission rules, integration tests for DRF permission classes

### Editor History Module

- **Core class**: `HistoryManager` with methods: `push(state)`, `undo()`, `redo()`, `clear()`, `reset()`
- **Configuration**: Constructor accepts `maxHistory` (default 100), `clone` function (default: element-aware shallow clone), eviction hooks
- **Eviction hooks**: Signature `(evictedStates, historySize) => void` for batch notification when stack exceeds limit
- **Per-preset instances**: One `HistoryManager` instance per canvas preset, managed by context
- **React hook**: `useEditorHistory(elements, options)` returns `{ undo, redo, canUndo, canRedo, clear, reset }`
- **File structure**: `src/lib/editor/HistoryManager.js` (pure class), `src/hooks/editor/useEditorHistory.js` (React hook)
- **Testing**: Unit tests for HistoryManager class (no React), integration tests for hook with `@testing-library/react-hooks`

### API Hooks Module

- **Generic hooks**: `useApiQuery(endpoint, options)` returns `{ data, isLoading, isRefreshing, refresh, error, invalidate, meta }`; `useApiMutation(endpoint)` returns `{ execute, isExecuting, error, result }`
- **Page-specific hooks**: Domain-specific wrappers (e.g., `useDashboardStats()`) that configure generic hooks with endpoint and options
- **Caching**: React Query (`@tanstack/react-query`) for automatic caching, refetching, and background updates
- **QueryClient**: Global singleton created in `src/main.jsx` with `QueryClientProvider`, optional subtree providers for special cases
- **File structure**: `src/hooks/api/useApiQuery.js`, `src/hooks/api/useApiMutation.js`, `src/hooks/dashboard/useDashboardStats.js`, etc.
- **Testing**: Unit tests for generic hooks (mock QueryClient), integration tests for page-specific hooks

### Test Surface Seam

- **File structure**: `tests/fixtures/`, `tests/factories/`, `tests/utils/`, `tests/mocks/`
- **Fixtures**: Model fixtures for backend (User, Certificate, Template, AuthorisationReference), API fixtures for frontend (pre-canned JSON responses)
- **Factories**: Hybrid approach - `factory_boy` for complex models with sequences/traits, custom factory functions for simple models
- **MSW mocks**: Per-feature handlers in `tests/mocks/` (e.g., `dashboardHandlers.js`, `certificatesHandlers.js`)
- **Test utilities**: Assertion helpers (custom matchers, test data generators) + test setup utilities (database fixtures, test client configuration)
- **Backend test client**: Custom wrapper around DRF APIClient with auth helpers (`login_as()`, `logout()`, `impersonate()`) and CRUD shortcuts (`create_certificate()`, `update_user()`)
- **Test data generation**: Both fixtures (JSON/YAML) for common cases and builder pattern (`TestCertificateBuilder().with_student().with_template().build()`) for dynamic scenarios
- **Frontend tests**: Rendering tests (snapshot + DOM structure) + interaction tests (user flows via userEvent)
- **Integration tests**: Critical flows with real backend and test database, other tests with MSW mocks
- **Migration**: Strangler fig approach, migrate one test file at a time

## Testing Decisions

### What makes a good test

- Tests external behavior, not implementation details
- Tests are isolated and independent
- Tests use descriptive names that explain what they verify
- Tests are fast (unit tests) and comprehensive (integration tests)
- Tests use fixtures and factories for consistent test data
- Tests mock external dependencies (API, database) appropriately

### Modules with tests

**Certificate Rendering Module** (Priority 1):
- Unit tests for `PDFRenderer` and `PNGRenderer` with mock Certificate objects
- Unit tests for common utilities (text wrapping, placeholder replacement, color conversion)
- Integration tests for `CertificateRenderingService` with real Certificate fixtures
- Tests verify: correct PDF/PNG output, text wrapping consistency, error handling

**Editor History Module** (Priority 1):
- Unit tests for `HistoryManager` class (stack operations, limits, eviction, cloning)
- Integration tests for `useEditorHistory` hook with `@testing-library/react-hooks`
- Tests verify: undo/redo correctness, stack limit enforcement, eviction hooks, per-preset isolation

**API Hooks Module** (Priority 1):
- Unit tests for `useApiQuery` and `useApiMutation` with mocked QueryClient
- Integration tests for page-specific hooks (e.g., `useDashboardStats`) with MSW mocks
- Tests verify: data fetching, caching, refresh, error handling, mutation execution

**Test Surface Seam** (Priority 1):
- Tests for factory functions (verify correct object creation)
- Tests for MSW handlers (verify correct mock responses)
- Tests for test client helpers (verify auth and CRUD shortcuts)
- Tests for builder pattern (verify flexible test data generation)

**Account Lifecycle Service** (Priority 2):
- Unit tests with mock repositories
- Integration tests with real database

**Authorization Policy Module** (Priority 2):
- Unit tests for permission rules
- Integration tests for DRF permission classes

### Prior art for tests

- Existing Django tests in `certificates/tests/` for model and view testing patterns
- Existing React component tests (if any) for component testing patterns
- DRF test client documentation for backend test patterns
- React Query testing documentation for hook testing patterns
- MSW documentation for API mocking patterns

## Out of Scope

- Database schema changes (no migrations required)
- API contract changes (public API remains the same)
- Frontend UI changes (no visual changes to the application)
- Performance optimization beyond architectural improvements
- New features or functionality (only refactoring existing code)
- Documentation updates beyond code comments and docstrings
- Deployment or infrastructure changes

## Further Notes

- All modules follow the deep module principle: simple interfaces that encapsulate complex logic
- Migration strategy is strangler fig for all modules: create new module side-by-side, migrate incrementally
- Feature flags will be used selectively for high-risk or high-traffic endpoints during migration
- Django app config factories are the canonical DI entry point, with constructor injection for testability
- React Query is adopted for frontend data caching, replacing manual state management
- MSW is adopted for frontend API mocking, replacing manual axios mocks
- Test infrastructure is established before writing module tests to ensure consistent patterns
