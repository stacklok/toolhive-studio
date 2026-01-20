# MSW Auto-Mocker

> **Source files:** The mocking system is implemented in `renderer/src/common/mocks/`. See the source files directly for implementation details:
>
> - `autoAPIMock.ts` - The `AutoAPIMock` wrapper implementation
> - `mocker.ts` - Auto-generation of fixtures from OpenAPI schema
> - `node.ts` - MSW server setup and request recording

- Handlers: `renderer/src/common/mocks/handlers.ts` combines custom handlers and auto-generated mocks.
- Custom handlers: add hand-written handlers in `renderer/src/common/mocks/customHandlers/index.ts`. These take precedence over schema-based mocks.
- Auto-generated: `renderer/src/common/mocks/mocker.ts` reads `api/openapi.json` and creates fixtures under `renderer/src/common/mocks/fixtures` on first run.

## Usage

- Vitest: tests initialize MSW in `vitest.setup.ts`. Run `pnpm test`.

## Generating fixtures

- To create a new fixture for an endpoint, simply run a Vitest test that calls that endpoint. The auto-mocker will generate `renderer/src/common/mocks/fixtures/<sanitized-path>/<method>.ts` on first use using schema-based fake data.
- To customize the response, edit the generated TypeScript file. This is preferred over writing a custom handler for simple data tweaks (e.g., replacing lorem ipsum with realistic text). Custom handlers are intended for behavior overrides or endpoints without schema.

## Regeneration

- Delete a fixture file to re-generate it on next request.

## Failure behavior (always strict)

- If a schema is missing or faker fails, the handler responds 500 and does not write a placeholder.
- Invalid fixtures respond 500.

## Types

- Fixtures use strict types via the `AutoAPIMock` wrapper. Generated modules import response types from `@api/types.gen` and pass them as generic parameters to `AutoAPIMock<T>` for type safety.
- The `@mocks` path alias points to `renderer/src/common/mocks`.

## Test-Scoped Overrides with AutoAPIMock

Each fixture is wrapped in `AutoAPIMock<T>`, which provides test-scoped override capabilities.

### Fixture Structure

Generated fixtures use named exports with a consistent naming convention:

```typescript
// renderer/src/common/mocks/fixtures/groups/get.ts
import type { GetApiV1BetaGroupsResponse } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaGroups = AutoAPIMock<GetApiV1BetaGroupsResponse>(
  {
    groups: [
      { name: 'default', registered_clients: ['client-a'] },
      { name: 'research', registered_clients: ['client-b'] },
    ],
  }
)
```

### Overriding in Tests

Use `.override()` for type-safe response modifications, or `.overrideHandler()` for full control (errors, network failures):

```typescript
import { HttpResponse } from 'msw'
import { mockedGetApiV1BetaGroups } from '@mocks/fixtures/groups/get'

// Type-safe data override
mockedGetApiV1BetaGroups.override(() => ({
  groups: [],
}))

// Modify default data
mockedGetApiV1BetaGroups.override((data) => ({
  ...data,
  groups: data.groups?.slice(0, 1),
}))

// Error responses (use overrideHandler)
mockedGetApiV1BetaGroups.overrideHandler(() =>
  HttpResponse.json({ error: 'Server error' }, { status: 500 })
)

// Network error
mockedGetApiV1BetaGroups.overrideHandler(() => HttpResponse.error())
```

Overrides are automatically reset before each test via `resetAllAutoAPIMocks()` in `vitest.setup.ts`.

### Conditional Overrides (Request-Aware)

Sometimes you need the response to depend on query params or headers (for example, to verify the query param is sent). Prefer a test-scoped conditional override instead of making it the default across the suite.

```typescript
import { mockedGetApiV1BetaWorkloads } from '@mocks/fixtures/workloads/get'

mockedGetApiV1BetaWorkloads.conditionalOverride(
  (info) => new URL(info.request.url).searchParams.get('group') === 'archive',
  (data) => ({
    ...data,
    workloads: [],
  })
)
```

You can call `conditionalOverride` multiple times in a test. Each call wraps the current handler and only applies when its predicate matches.

### Accessing Default Data

Use `.defaultValue` to access the fixture's default data:

```typescript
import { mockedGetApiV1BetaGroups } from '@mocks/fixtures/groups/get'

const defaultGroups = mockedGetApiV1BetaGroups.defaultValue
// Use in custom server.use() handlers or assertions
```

### Reusable Scenarios

Define named scenarios in your fixture for commonly used test states:

```typescript
// renderer/src/common/mocks/fixtures/groups/get.ts
import type { GetApiV1BetaGroupsResponse } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

export const mockedGetApiV1BetaGroups = AutoAPIMock<GetApiV1BetaGroupsResponse>(
  {
    groups: [{ name: 'default', registered_clients: ['client-a'] }],
  }
)
  .scenario('empty', (self) =>
    self.override(() => ({
      groups: [],
    }))
  )
  .scenario('server-error', (self) =>
    self.overrideHandler(() =>
      HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    )
  )
```

Then use them in tests:

```typescript
import { MockScenarios } from '@mocks'
import { mockedGetApiV1BetaGroups } from '@mocks/fixtures/groups/get'

describe('groups', () => {
  it('handles empty groups', async () => {
    mockedGetApiV1BetaGroups.activateScenario(MockScenarios.Empty)

    // Test empty state...
  })

  it('handles server error', async () => {
    mockedGetApiV1BetaGroups.activateScenario(MockScenarios.ServerError)

    // Test error handling...
  })
})
```

### Global Scenario Activation

Use `activateMockScenario` to activate a scenario across all registered mocks at once. This is useful for setting up a consistent state across multiple endpoints:

```typescript
import { activateMockScenario, MockScenarios } from '@mocks'
import { mockedGetApiV1BetaGroups } from '@mocks/fixtures/groups/get'

describe('error handling', () => {
  it('shows error page when all APIs fail', async () => {
    // Activate "server-error" on all mocks that define it
    // Mocks without this scenario will use their default response
    activateMockScenario(MockScenarios.ServerError)

    // Test that the app handles the error state correctly
  })

  it('handles partial failures gracefully', async () => {
    // Start with all APIs returning errors
    activateMockScenario(MockScenarios.ServerError)

    // Then reset specific endpoints to use their default response
    mockedGetApiV1BetaGroups.reset()

    // Now only other endpoints return errors, groups endpoint works
  })
})
```

Scenario names are defined in `renderer/src/common/mocks/scenarioNames.ts` via the `MockScenarios` object, which provides autocomplete and JSDoc documentation. Global scenarios are automatically reset before each test via `resetAllAutoAPIMocks()` in the test setup.

## Request Recording

Use `recordRequests()` from `@/common/mocks/node` to capture API requests for assertions. This is the preferred way to verify that your code sends the correct API calls.

```typescript
import { recordRequests } from '@/common/mocks/node'

it('sends correct payload when creating a group', async () => {
  const rec = recordRequests()

  // ... perform actions that trigger API calls ...

  const request = rec.recordedRequests.find(
    (r) => r.method === 'POST' && r.pathname === '/api/v1beta/groups'
  )
  expect(request).toBeDefined()
  expect(request?.payload).toMatchObject({
    name: 'my-group',
  })
})
```

Each recorded request contains:

- `pathname` - The URL path (e.g., `/api/v1beta/groups`)
- `method` - HTTP method (e.g., `GET`, `POST`)
- `payload` - Parsed JSON body (if present)
- `search` - Query parameters as key-value pairs

Calling `recordRequests()` clears previous recordings, so each test starts fresh.
