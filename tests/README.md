# Test Infrastructure

This directory contains organized test data, utilities, and mocks for the UEW CerTiFyHub project.

## Directory Structure

```
tests/
├── fixtures/          # Pre-canned test data
│   ├── backend/       # Django model fixtures (User, Certificate, Template, etc.)
│   └── frontend/      # API response fixtures (JSON for endpoint testing)
├── factories/         # Factory functions for dynamic test data generation
│   └── (factory_boy + custom factories)
├── utils/             # Test utilities and helpers
│   ├── assertions/    # Custom matchers and assertion helpers
│   └── setup/         # Test setup utilities (database fixtures, test client)
└── mocks/             # MSW (Mock Service Worker) handlers organized by feature
    ├── dashboard/     # Dashboard API mocks
    ├── certificates/  # Certificates API mocks
    └── ...
```

## Usage

### Fixtures

Use pre-canned fixtures for common test scenarios:

```python
from tests.fixtures.backend import user_fixture, certificate_fixture
```

### Factories

Use factories for dynamic test data:

```python
from tests.factories import UserFactory, CertificateFactory

user = UserFactory(email="test@example.com")
certificate = CertificateFactory(student=user)
```

### MSW Mocks

Configure MSW handlers for frontend tests:

```javascript
import { setupServer } from 'msw/node'
import { dashboardHandlers } from 'tests/mocks/dashboard'

const server = setupServer(...dashboardHandlers)
```

### Test Utilities

Use custom test client for backend tests:

```python
from tests.utils import APITestClient

client = APITestClient()
client.login_as(user)
response = client.post('/api/certificates/', {...})
```

## Conventions

- Fixtures are for static, reusable test data
- Factories are for dynamic, parameterized test data
- Mocks are organized by feature/domain
- All Python directories have `__init__.py` for imports
