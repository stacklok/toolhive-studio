# AGENTS.md

This file provides guidance to AI coding assistants working with this repository.

## Project Overview

ToolHive Studio is an Electron desktop application for managing MCP (Model Context Protocol) servers. Built with React 19, TypeScript 6, Electron 41, and Vite 8. Uses pnpm as package manager. Requires Node.js >=24 <25.

## Essential Commands

```bash
pnpm install                    # Install dependencies
pnpm run start                  # Start dev server with hot reload
pnpm run lint                   # Lint (zero warnings allowed)
pnpm run type-check             # TypeScript type checking
pnpm run format                 # Format with Prettier
pnpm run test:nonInteractive    # Run unit tests
pnpm run test:coverage          # Unit tests with coverage
pnpm run e2e                    # End-to-end tests
pnpm run generate-client        # Regenerate API client from OpenAPI spec
pnpm run knip                   # Detect unused code
```

**Pre-commit requirement**: `pnpm run lint` and `pnpm run type-check` must both pass before committing.

## Architecture

Electron app with three-process model:

| Directory    | Purpose                                                   |
| ------------ | --------------------------------------------------------- |
| `main/`      | Main process — app lifecycle, IPC, SQLite DB, auto-update |
| `renderer/`  | Renderer process — React UI, routing, API calls           |
| `preload/`   | Preload scripts — IPC bridge via `window.electronAPI`     |
| `common/`    | Shared code — generated API client, types, constants      |
| `utils/`     | Build utilities and scripts                               |
| `e2e-tests/` | Playwright end-to-end tests                               |

### Key Libraries

- **Routing**: TanStack Router (file-based, auto-generated route tree)
- **Server state**: TanStack React Query
- **UI**: Radix UI + Tailwind CSS + CVA
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest + Testing Library + MSW (Mock Service Worker)
- **AI/Chat**: Vercel AI SDK with multiple providers (Anthropic, OpenAI, Google, xAI, Ollama)

### Feature Structure

```
renderer/src/
  routes/                 # File-based routes (TanStack Router)
  features/{name}/        # Feature modules
    components/           # Feature-specific components
    hooks/                # Feature-specific hooks
    lib/                  # Feature utilities
    types/                # Feature types
  common/                 # Shared across features
    components/           # Reusable UI components
    hooks/                # Shared hooks
    lib/                  # Core utilities
    mocks/                # MSW handlers and fixtures
```

## Code Conventions

- **File names**: kebab-case always (e.g., `card-mcp-server.tsx`)
- **Components**: PascalCase, functional with hooks
- **Path aliases**: `@/*` (renderer/src), `@common/*`, `@utils/*`, `@mocks/*`
- **Imports**: use aliases for cross-directory imports, not relative paths
- **Exports**: named exports preferred over default exports

## Testing Patterns

- Tests in `__tests__/` directories colocated with source
- API mocking via auto-generated MSW fixtures from OpenAPI spec
- See `docs/mocks.md` for mocking patterns
- Use `.override()` / `.overrideHandler()` for test-specific API responses
- Use `recordRequests()` to assert on outgoing API calls

## Commit and PR Guidelines

- [Conventional Commits](https://www.conventionalcommits.org/) format required
- PR titles validated against conventional commit spec by CI
- Keep PRs small and focused
- See `CONTRIBUTING.md` for details
