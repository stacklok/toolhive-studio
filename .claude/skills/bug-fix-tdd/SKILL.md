---
name: bug-fix-tdd
description: Reproduce and fix bugs using TDD. Use when analyzing a bug report, writing a regression test, or applying a minimal fix. Covers test placement, mock patterns, and the red-green-refactor workflow for automated bug fixing.
---

# Bug Fix TDD

Reproduce bugs with a failing test, then apply the minimum fix. This skill is used by the automated bug-fix agent in CI but can also be invoked manually.

## TDD Workflow

### Phase 1 — Analysis & Failing Test (Red)

1. **Parse the bug report**: extract description, steps to reproduce, expected vs actual behavior
2. **Find relevant code**: use Grep/Glob to locate the component, hook, or route mentioned in the bug
3. **Write a unit test** that reproduces the bug — the test MUST FAIL
4. **Run the test**: `pnpm run test:nonInteractive -- <test-file-path>`
5. **Verify failure reason**: the test must fail because of the bug, not because of import errors or unrelated issues
6. **Retry if needed**: if the test passes (bug not reproduced), try a different approach (max 5 attempts)
7. **Write `bug-analysis.md`** with findings (see format below)

**Constraints**: Do NOT modify source files in Phase 1. Only create/edit test files and `bug-analysis.md`.

### Phase 2 — Fix (Green)

1. **Read the failing test** and `bug-analysis.md`
2. **Apply the MINIMUM fix** to make the test pass — do not over-engineer
3. **Run the single test**: `pnpm run test:nonInteractive -- <test-file-path>`
4. **Run the full suite**: `pnpm run test:nonInteractive`
5. **Run static checks**: `pnpm run lint` and `pnpm run type-check`
6. **Retry if needed**: if any check fails, adjust the fix (max 5 attempts)
7. **Write `pr-body.md` and `fix-title.txt`**

**Constraints**: Do NOT run git, gh, or modify .env files.

## Test Placement Rules

- Tests go in `__tests__/` directories colocated with the source file
- If a test file already exists for the component, **add a new `describe('Bug #N', ...)` block** instead of creating a new file
- Naming: `<component-name>.test.tsx` or `<hook-name>.test.ts`
- Example: source at `renderer/src/features/skills/components/card-skill.tsx` → test at `renderer/src/features/skills/components/__tests__/card-skill.test.tsx`

## Test Patterns

### Component test (simplest)

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

render(
  <QueryClientProvider client={queryClient}>
    <MyComponent prop="value" />
  </QueryClientProvider>
)

await userEvent.click(screen.getByRole('button', { name: /save/i }))
await waitFor(() => {
  expect(screen.getByText('Saved')).toBeVisible()
})
```

### Route-level component test

```typescript
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'

const router = createTestRouter(MyPage, '/my-page')
renderRoute(router, { permissions: { canManageClients: true } })

await waitFor(() => {
  expect(screen.getByRole('heading', { name: /my page/i })).toBeVisible()
})
```

### Hook test

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})
const Wrapper = ({ children }) =>
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

const { result } = renderHook(() => useMyHook(), { wrapper: Wrapper })

await waitFor(() => expect(result.current.isLoading).toBe(false))
expect(result.current.data).toEqual({ ... })
```

### API mock override (return different data)

```typescript
import { mockedGetApiV1BetaWorkloads } from '@mocks/fixtures/workloads/get'

mockedGetApiV1BetaWorkloads.override((data) => ({
  ...data,
  workloads: [], // Force empty state
}))
```

### API mock error response

```typescript
import { HttpResponse } from 'msw'

mockedGetApiV1BetaWorkloads.overrideHandler(() =>
  HttpResponse.json({ error: 'Server error' }, { status: 500 })
)
```

### Request recording (for mutations)

```typescript
import { recordRequests } from '@/common/mocks/node'

const rec = recordRequests()
// ... trigger action ...
const request = rec.recordedRequests.find(
  (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
)
expect(request?.payload).toMatchObject({ name: 'my-server' })
```

## bug-analysis.md Format

```markdown
## Bug Summary

<1-2 sentences describing the bug>

## Root Cause

<Technical explanation of why the bug occurs>

## Relevant Files

- `path/to/source.tsx` — <what it does>
- `path/to/related.ts` — <why it's relevant>

Test file: path/to/\_\_tests\_\_/component.test.tsx

## Proposed Fix

<Description of the minimum change needed>

## Files to Modify

- `path/to/file.tsx` — <what to change>
```

**Important**: The `Test file:` line must be on its own line starting with exactly `Test file: ` followed by the path. This is parsed by the CI workflow.

## pr-body.md Format

```markdown
## Summary

Fixes #<issue-number>.

- <1-2 bullet points describing the fix>

## Test

- Added regression test in `<test-file-path>`
- Test reproduces the bug (fails before fix, passes after)

---

_Automated fix by Claude Code TDD Agent_
```

## fix-title.txt Format

Single line, conventional commit format:

```
fix(<scope>): <description> (#<issue-number>)
```

Example: `fix(skills): prevent crash when metadata is undefined (#423)`

## Related Skills

- **testing-with-api-mocks** — Auto-generated MSW fixtures and mock basics
- **testing-api-assertions** — Verifying mutations with `recordRequests()`
- **testing-api-overrides** — Conditional mock responses for testing filters/params
