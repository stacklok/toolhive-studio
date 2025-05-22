# Instructions for Copilot

## UI components

We will use `@ui-kit.ai/components` as the UI framework of choice.
An MCP server is provided that explains how to use specific components from @ui-kit.ai/components.
Before writing any UI code **ALWAYS** consult the MCP server to get a good understanding of how the library works.

## Data fetching

Data fetching will be done with `@tanstack/react-query` & the browser fetch API
All data fetching will be centralized in src/common/hooks, e.g.:

```plaintext
src
+-- common
    +-- hooks
        +-- useGetMcpServers.ts
        +-- useCreateMcpServer.ts
```

## File naming conventions

- We **always** use kebab-case for all filenames, never camelCase or PascalCase
- We name components with the most generic term left to right, e.g.:
  - `card-mcp-server-details.tsx` for a card component that displays an MCP server
  - `table-mcp-servers.tsx` for a table component that displays a list of MCP servers
  - `select-mcp-servers.tsx` for a select component that allows the user to select an MCP server

## Testing

- We use `vitest` for testing
- We use `@testing-library/react` for testing React components
- Tests are placed in the same folder as the component they are testing, in a directory called `__tests__`, e.g.:

```plaintext
src
+-- common
    +-- components
        +-- __tests__
            +-- component-a.test.tsx
            +-- component-b.test.tsx
        +-- component-a.ts
        +-- component-b.ts
```

## Project structure

Most of the code lives in the `src/` folder and looks something like this:

```plaintext
src
+-- app                 # application layer containing:
|   +-- routes          # directory containing application routes / can also be pages
|   +-- app.tsx         # main application component
|   +-- router.tsx      # application router configuration
+-- common              # the common folder contains all common code for the application
    +-- assets          # assets folder can contain all the static files such as images, fonts, etc.
    +-- components      # shared components used across the entire application
    +-- config          # global configurations, exported env variables etc.
    +-- hooks           # shared hooks used across the entire application
    +-- lib             # reusable libraries preconfigured for the application
    +-- testing         # test utilities and mocks
    +-- mocks           # mock service worker route handlers
    +-- types           # shared types used across the application
    +-- utils           # shared utility functions
+-- features            # feature based modules
    +-- {feature_name}  # each feature has its own folder containing all the code related to that feature
        +-- assets      # assets folder can contain all the static files for a specific feature
        +-- components  # components scoped to a specific feature
        +-- hooks       # hooks scoped to a specific feature
        +-- stores      # state stores for a specific feature
        +-- types       # typescript types used within the feature
        +-- utils       # utility functions for a specific feature
```
