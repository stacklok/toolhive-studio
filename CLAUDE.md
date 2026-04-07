# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

ToolHive Studio is an Electron desktop application for managing MCP (Model Context Protocol) servers. Built with React, TypeScript, and Vite. The Electron app bundles the [ToolHive CLI](https://github.com/stacklok/toolhive) (`thv`) binary.

## Build and Development Commands

```bash
pnpm install              # Install dependencies (runs rebuild for native modules)
pnpm run start            # Start dev server with hot reload
pnpm run lint             # ESLint (--max-warnings 0)
pnpm run type-check       # TypeScript checking (both app and node configs)
pnpm run format           # Format with Prettier
pnpm run test:nonInteractive  # Run unit tests (headless)
pnpm run test             # Run unit tests (interactive, requires display)
pnpm run test:coverage    # Unit tests with coverage
pnpm run e2e              # Package + run Playwright e2e tests
pnpm run knip             # Detect unused code
pnpm run generate-client  # Fetch OpenAPI spec + regenerate API client
```

**IMPORTANT**: Always run `pnpm run lint` and `pnpm run type-check` before committing. Both must pass.

## Environment Requirements

- Node.js >=24 <25 (use `nvm use` — `.nvmrc` is present)
- pnpm package manager
- Docker daemon must be running (required by ToolHive)

## Architecture

### Electron Process Model

The app follows the standard Electron three-process architecture:

- **`main/`** — Main process: app lifecycle, IPC handlers, database (SQLite), auto-update, deep links, CLI integration
- **`renderer/`** — Renderer process: React UI, routing, API calls, state management
- **`preload/`** — Preload scripts: bridge between main and renderer via `window.electronAPI`
- **`common/`** — Shared code: generated API client, types, constants

### Renderer Architecture

- **Routing**: TanStack Router with file-based convention in `renderer/src/routes/`
  - `__root.tsx` — root layout
  - Route files use dot-notation for nesting (e.g., `logs.$groupName.$serverName.tsx`)
  - Auto-generated `route-tree.gen.ts` — never edit manually
- **State**: TanStack React Query for server state, React Context for app state (theme, permissions)
- **API**: Generated client from OpenAPI spec in `common/api/generated/` — never edit manually
- **UI**: Radix UI primitives + Tailwind CSS + CVA for component variants
- **Forms**: React Hook Form + Zod validation

### Feature Organization

```
renderer/src/
  features/{name}/        # Feature modules (components, hooks, lib, types)
  common/                 # Shared code
    components/           # Reusable UI components
    hooks/                # Shared hooks
    lib/                  # Core utilities (query-client, analytics, feature-flags)
    mocks/                # MSW mock handlers and fixtures
    contexts/             # App-level React contexts
```

## Code Conventions

- **File naming**: always kebab-case (e.g., `card-mcp-server.tsx`, `use-auto-update.ts`)
- **Components**: PascalCase exports, functional components with hooks
- **Path aliases**: `@/*` (renderer/src), `@common/*` (common), `@utils/*` (utils), `@mocks/*` (mocks)
- **Imports**: use path aliases, not relative paths for cross-directory imports
- **Exports**: prefer named exports over default exports

## Testing

- **Unit tests**: Vitest + Testing Library + MSW for API mocking
- **Test location**: `__tests__/` directories colocated with source
- **API mocking**: Auto-generated MSW fixtures from OpenAPI spec. See `docs/mocks.md`
  - Fixtures in `renderer/src/common/mocks/fixtures/`
  - Use `.override()` / `.overrideHandler()` for test-specific responses
  - Use `recordRequests()` to assert on API calls
- **E2E tests**: Playwright in `e2e-tests/`

### Running a Single Test

```bash
pnpm run vitest:electron run path/to/file.test.tsx
```

## Commit and PR Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`, etc.
- PR titles must follow conventional commit format (validated by CI)
- Keep PRs small and focused (size/XS or size/S preferred)
- See `CONTRIBUTING.md` for full guidelines

## Key Documentation

- `docs/README.md` — Developer guide (setup, scripts, env vars, code signing)
- `docs/mocks.md` — API mocking patterns for tests
- `docs/e2e-testing.md` — E2E testing guide
- `docs/icons.md` — Icon system documentation
- `CONTRIBUTING.md` — Contribution guidelines and PR process
