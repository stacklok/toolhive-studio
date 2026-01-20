# CLAUDE.md

Project-specific guidance for AI agents working on this codebase.

## Testing with API Mocks

This project uses MSW with typed `AutoAPIMock` fixtures. When working on tests:

- **`/testing-with-api-mocks`** - Start here. How fixtures work, auto-generation, basic usage.

- **`/testing-api-overrides`** - For **read operations** (GET). Verify your code sends correct query params by setting up conditional mocks that return different data based on the request. Test the UI shows expected results.

- **`/testing-api-assertions`** - For **write operations** (POST/PUT/DELETE). Verify your code sends correct payloads by recording requests and asserting on them.
