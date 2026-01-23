---
name: testing-with-api-mocks
description: Start here for all API mocking in tests. Covers auto-generation, fixtures, and when to use other skills. Required reading before creating, refactoring, or modifying any test involving API calls.
---

# Testing with API Mocks

**This is the starting point for all API mocking in tests.** Read this skill first before working on any test that involves API calls.

This project uses MSW (Mock Service Worker) with auto-generated schema-based mocks. When writing tests for code that calls API endpoints, mocks are created automatically.

## How It Works

1. **Run a test** that triggers an API call (e.g., a component that fetches data)
2. **Mock auto-generates** if no fixture exists for that endpoint
3. **Fixture saved** to `renderer/src/common/mocks/fixtures/<endpoint>/<method>.ts`
4. **Subsequent runs** use the saved fixture

No manual mock setup is required for basic tests.

## Fixture Location

Fixtures are organized by endpoint path and HTTP method:

```
renderer/src/common/mocks/fixtures/
├── groups/
│   ├── get.ts          # GET /api/v1beta/groups
│   └── post.ts         # POST /api/v1beta/groups
├── workloads/
│   └── get.ts          # GET /api/v1beta/workloads
├── workloads_name/
│   └── get.ts          # GET /api/v1beta/workloads/:name
└── ...
```

Path parameters like `:name` become `_name` in the directory name.

## Fixture Structure

Generated fixtures use the `AutoAPIMock` wrapper with types from the OpenAPI schema:

```typescript
// renderer/src/common/mocks/fixtures/groups/get.ts
import type {
  GetApiV1BetaGroupsResponse,
  GetApiV1BetaGroupsData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaGroups = AutoAPIMock<
  GetApiV1BetaGroupsResponse,
  GetApiV1BetaGroupsData
>({
  groups: [
    { name: 'default', registered_clients: ['client-a'] },
    { name: 'research', registered_clients: ['client-b'] },
  ],
})
```

The second type parameter (`*Data`) provides typed access to request parameters (query, path, body) for conditional overrides.

### Naming Convention

Export names follow the pattern: `mocked` + HTTP method + endpoint path in PascalCase.

- `GET /api/v1beta/groups` → `mockedGetApiV1BetaGroups`
- `POST /api/v1beta/workloads` → `mockedPostApiV1BetaWorkloads`
- `GET /api/v1beta/workloads/:name` → `mockedGetApiV1BetaWorkloadsByName`

## Writing a Basic Test

For most tests, just render the component and the mock handles the rest:

```typescript
import { render, screen, waitFor } from '@testing-library/react'

it('displays groups from the API', async () => {
  render(<GroupsList />)

  await waitFor(() => {
    expect(screen.getByText('default')).toBeVisible()
  })
})
```

The auto-generated mock provides realistic fake data based on the OpenAPI schema.

## Customizing Fixture Data

If the auto-generated data doesn't suit your test, edit the fixture file directly:

```typescript
// renderer/src/common/mocks/fixtures/groups/get.ts
export const mockedGetApiV1BetaGroups = AutoAPIMock<
  GetApiV1BetaGroupsResponse,
  GetApiV1BetaGroupsData
>({
  groups: [
    { name: 'production', registered_clients: ['claude-code'] }, // Custom data
    { name: 'staging', registered_clients: [] },
  ],
})
```

This becomes the new default for all tests using this endpoint.

## Regenerating a Fixture

To regenerate a fixture with fresh schema-based data:

1. Delete the fixture file
2. Run a test that calls that endpoint
3. New fixture auto-generates

```bash
rm renderer/src/common/mocks/fixtures/groups/get.ts
pnpm test -- --run <test-file>
```

## Key Imports

```typescript
// Types for API responses and request parameters
import type {
  GetApiV1BetaGroupsResponse,
  GetApiV1BetaGroupsData,
} from '@api/types.gen'

// AutoAPIMock wrapper
import { AutoAPIMock } from '@mocks'

// Fixture mocks (for test-scoped overrides, see: testing-api-overrides skill)
import { mockedGetApiV1BetaGroups } from '@mocks/fixtures/groups/get'
```

## 204 No Content Endpoints

For endpoints that return 204, create a minimal `AutoAPIMock` fixture and override the handler in each test:

```typescript
// renderer/src/common/mocks/fixtures/health/get.ts
import type { GetHealthResponse, GetHealthData } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetHealth = AutoAPIMock<GetHealthResponse, GetHealthData>(
  '' as unknown as GetHealthResponse
)
```

Then in tests, use `.overrideHandler()` to return the appropriate response:

```typescript
import { mockedGetHealth } from '@mocks/fixtures/health/get'
import { HttpResponse } from 'msw'

it('navigates on health check success', async () => {
  mockedGetHealth.overrideHandler(() => new HttpResponse(null, { status: 204 }))
  // ...
})

it('handles health check failure', async () => {
  mockedGetHealth.overrideHandler(() => HttpResponse.error())
  // ...
})
```

## Custom Mocks (Text/Plain Endpoints)

**Custom mocks are only needed for text/plain endpoints.** The only current example is the logs endpoint:

```typescript
// renderer/src/common/mocks/customHandlers/index.ts
export const customHandlers = [
  http.get(mswEndpoint('/api/v1beta/workloads/:name/logs'), ({ params }) => {
    const { name } = params
    const logs = getMockLogs(name as string)
    return new HttpResponse(logs, { status: 200 })
  }),
]
```

To override the logs response in tests, use the exported `getMockLogs` mock:

```typescript
import { getMockLogs } from '@/common/mocks/customHandlers'

getMockLogs.mockReturnValueOnce('Custom log content for this test')
```

## Related Skills

- **testing-api-overrides** - Test-scoped overrides and conditional responses for testing filters/params
- **testing-api-assertions** - Verifying API calls for mutations (create/update/delete)
