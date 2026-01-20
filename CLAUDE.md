# CLAUDE.md

Project-specific guidance for AI agents working on this codebase.

## Testing with API Mocks

This project uses MSW with typed `AutoAPIMock` fixtures.

**REQUIRED**: Invoke `/testing-with-api-mocks` first whenever you are:
- Creating new tests that involve API calls
- Refactoring existing tests
- Modifying test files in any way that affects or might affect API mocking

Understanding the auto-generation behavior is essential - fixtures are created automatically when tests run, and this affects how mocks work throughout the test suite.

- **`/testing-with-api-mocks`** - **Start here.** Covers fixture auto-generation, naming conventions, basic usage, and when to use the other skills.

- **`/testing-api-overrides`** - For **read operations** (GET). Verify your code sends correct query params by setting up conditional mocks that return different data based on the request. Test the UI shows expected results.

- **`/testing-api-assertions`** - For **write operations** (POST/PUT/DELETE). Verify your code sends correct payloads by recording requests and asserting on them.
