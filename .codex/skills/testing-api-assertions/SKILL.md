---
name: testing-api-assertions
description: Verify API requests in tests. Use when testing that correct API calls are made for create, update, or delete operations. Use when testing mutations, form submissions, or actions with backend side effects.
---

# Testing API Assertions

Verify that your code sends the correct API requests for operations with side effects.

## When to Use Request Assertions

**DO use** for operations with side effects:

- Creating resources (POST)
- Updating resources (PUT/PATCH)
- Deleting resources (DELETE)
- Any mutation that changes backend state

**DON'T use** for read operations:

- Fetching data (GET)
- For these, just verify the component displays the data correctly
- The mock API is not stateful, so verifying GET requests adds no value

## recordRequests()

Use `recordRequests()` to capture all API requests made during a test:

```typescript
import { recordRequests } from '@/common/mocks/node'

it('creates a group with correct payload', async () => {
  const rec = recordRequests()

  // ... perform action that triggers API call ...
  await userEvent.click(screen.getByRole('button', { name: /create/i }))

  // Find the request
  const request = rec.recordedRequests.find(
    (r) => r.method === 'POST' && r.pathname === '/api/v1beta/groups'
  )

  // Assert it was made with correct data
  expect(request).toBeDefined()
  expect(request?.payload).toEqual({ name: 'my-group' })
})
```

## Recorded Request Shape

Each recorded request contains:

```typescript
{
  pathname: '/api/v1beta/groups',      // URL path
  method: 'POST',                       // HTTP method
  payload: { name: 'my-group' },        // Parsed JSON body (if present)
  search: { filter: 'active' },         // Query parameters
}
```

## Common Patterns

### Verify POST payload

```typescript
const rec = recordRequests()

// ... trigger create action ...

const createRequest = rec.recordedRequests.find(
  (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
)
expect(createRequest?.payload).toMatchObject({
  name: 'my-server',
  group: 'default',
})
```

### Verify DELETE was called

```typescript
const rec = recordRequests()

// ... trigger delete action ...

const deleteRequest = rec.recordedRequests.find(
  (r) =>
    r.method === 'DELETE' && r.pathname === '/api/v1beta/workloads/my-server'
)
expect(deleteRequest).toBeDefined()
```

### Verify request order

```typescript
const rec = recordRequests()

// ... trigger actions ...

const postRequests = rec.recordedRequests.filter((r) => r.method === 'POST')
const groupIndex = postRequests.findIndex((r) => r.pathname.includes('/groups'))
const workloadIndex = postRequests.findIndex((r) =>
  r.pathname.includes('/workloads')
)

// Group must be created before workload
expect(groupIndex).toBeLessThan(workloadIndex)
```

### Verify request count

```typescript
const rec = recordRequests()

// ... trigger batch action ...

const deleteRequests = rec.recordedRequests.filter(
  (r) =>
    r.method === 'DELETE' && r.pathname.startsWith('/api/v1beta/workloads/')
)
expect(deleteRequests).toHaveLength(3)
```

## Important Notes

- `recordRequests()` clears previous recordings when called
- Call it at the start of your test, before triggering actions
- Each test starts fresh - recordings don't persist between tests
- Use `toMatchObject()` for partial matching when payload has extra fields

## When NOT to Use This

For read operations (GET) where you need to verify query parameters are sent correctly, **don't** use `recordRequests()`. Instead, use conditional overrides that return different data based on params, then verify the UI shows the expected data. See **testing-api-overrides** skill.

This approach is more robust because it tests actual user-facing behavior.

## Related Skills

- **testing-with-api-mocks** - Auto-generated mocks and fixture basics
- **testing-api-overrides** - Conditional responses for testing filters/params (read operations)
