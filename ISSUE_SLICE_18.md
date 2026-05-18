## Parent

#1 - Architectural Improvements: Extract Deep Modules for Testability

## What to build

Create the test infrastructure directory structure to establish a foundation for organized, maintainable test data and mocking across the codebase.

Create four directories under `tests/`:
- `fixtures/` - for model fixtures (backend) and API fixtures (frontend)
- `factories/` - for factory_boy and custom factory functions
- `utils/` - for assertion helpers and test setup utilities
- `mocks/` - for MSW handlers organized by feature

Add `__init__.py` files to Python directories to make them importable packages.

This slice establishes the structure only - no actual fixtures, factories, or mocks are added yet. Subsequent slices will populate these directories with content.

## Acceptance criteria

- [ ] `tests/fixtures/` directory exists with `backend/` and `frontend/` subdirectories
- [ ] `tests/factories/` directory exists with `__init__.py`
- [ ] `tests/utils/` directory exists with `__init__.py`
- [ ] `tests/mocks/` directory exists with subdirectories for features (dashboard, certificates, etc.)
- [ ] All Python directories have `__init__.py` files
- [ ] Directory structure is documented in a `tests/README.md` file explaining the purpose of each directory

## Blocked by

None - can start immediately
