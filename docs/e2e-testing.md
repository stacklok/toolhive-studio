# End-to-end testing

ToolHive’s E2E suite uses Playwright to run the packaged Electron app. Tests are
executed against the prebuilt app in `out/`, mirroring real user flows end to
end.

## Prerequisites

- `pnpm install`
- Ollama running locally (default: `http://localhost:11434`)

## Run the suite

- **Recommended**: build + tests (avoids stale builds)
  - `pnpm run e2e`
- **Fast iteration**: tests only (reuse `out/`)
  - `pnpm run e2e:prebuilt`
  - Use this when you haven’t changed the app build and want faster test runs.

## Coverage philosophy

- E2E scenarios focus on happy paths and core workflows.
- We prioritize scenarios that deliver high value without introducing flaky,
  costly-to-maintain test infrastructure, and that can be run locally without
  disrupting a developer’s ToolHive setup.
- Edge cases and destructive flows are covered by unit/integration tests.

## Test isolation

Test isolation is imperfect because the app stores state on disk and runs real
workloads. We mitigate this by creating a dedicated test group and cleaning it
up via the `thv` CLI before and after each run. This limits coverage (for
example, we avoid tests that rely on the default group) and some state (like
local caches) may still persist across runs.

## Limitations

- E2E runs only on GitHub Actions Linux runners for performance. macOS and
  Windows runners are significantly slower and are not part of the default
  E2E matrix.
- Tests focus on daily user interactions (full end-to-end flows with backend
  services and Playground). We do not cover OS-specific install/uninstall flows,
  auto-updates, or platform-dependent behaviors.
- Features that rely on native OS dialogs (such as file pickers) are not
  currently E2E tested.
- Feature-specific constraints are documented in each section below.

## Coverage

### Install and manage MCPs (Registry + Remote)

- **Tested**: install/uninstall a server from the default registry and add a
  remote MCP server, then enable its tools in the UI.
- **Notes**: due to test isolation constraints, we only use the default registry.
  Remote server authentication flows are not fully tested end-to-end. The server
  is a local test MCP instance (not a separate machine) and is not managed by
  ToolHive—only registered as a remote endpoint.

### Playground tool calling

- **Tested**: verify the Playground can invoke an MCP tool and return a response.
- **Notes**: uses a local test MCP server for deterministic behavior.

### Secrets

- **Tested**: create and delete a secret through the UI.
- **Notes**: only validates CRUD; does not assert secrets inside server runtime.

### Settings

- **Tested**: version tab shows the ToolHive binary version.
- **Notes**: other settings are intentionally avoided because test isolation is
  limited. Mutating settings can bleed across runs or affect a developer’s local
  ToolHive environment.

## Troubleshooting

- CI artifacts (screenshots, traces, videos) are attached to GitHub Actions
  runs. See GitHub’s documentation for downloading artifacts:
  - https://docs.github.com/en/actions/managing-workflow-runs/downloading-workflow-artifacts
- For local UI debugging, use Playwright’s tracing or set `PWDEBUG=1`.
