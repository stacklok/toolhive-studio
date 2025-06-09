# ToolHive Studio

This is the front-end for ToolHive Studio, an Electron application built with React, TypeScript, and Vite.

## Getting Started

This project uses [pnpm](https://pnpm.io/) as the package manager.

It is recommended to use a Node.js version manager like `nvm` or `fnm`. The required Node.js version is specified in the `.nvmrc` file (which points to the latest LTS version).

> [!IMPORTANT]
> Make sure the Docker daemon is running before you start, as it is required by ToolHive.

To get started, follow these steps:

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```
2.  **Run the initial build**:

    ```bash
    pnpm run make
    ```

    This command needs to be run once to build the application before starting the development server.

3.  **Start the development server**:
    ```bash
    pnpm run start
    ```
    This will start the Electron application with hot reload for the renderer process.

## Available Scripts

Here are the most common scripts you will use during development:

- `pnpm run start`: Starts the development server with hot reload.
- `pnpm run lint`: Lints the code using ESLint.
- `pnpm run format`: Formats the code with Prettier.
- `pnpm run type-check`: Runs TypeScript type checking.
- `pnpm run test`: Runs tests using Vitest.
- `pnpm run test:coverage`: Runs tests with coverage.

### Building and Packaging

- `pnpm run package`: Packages the application for the current platform.
- `pnpm run make`: Creates distributable packages for the application.

### API Client Generation

- `pnpm run generate-client`: Fetches the latest OpenAPI specification and generates the API client.
- `pnpm run generate-client:nofetch`: Generates the API client from the existing local OpenAPI specification.

## Project Structure

The project is structured as a typical Electron application:

- `main/`: Contains the code for the Electron main process.
- `preload/`: Contains the preload scripts for the Electron renderer process.
- `renderer/`: Contains the React application for the renderer process. This is where the UI components live.

## Environment variables

> [!IMPORTANT]  
> Electron applications can be decompiled, so do not store sensitive information in environment variables. Use secure methods to handle sensitive data.

The project uses environment variables for configuration. You can set these in a
`.env` file in the root directory. The `.env.example` file provides a template
for the required variables.

| Variable     | Required | Description                    |
| ------------ | -------- | ------------------------------ |
| `SENTRY_DSN` | `false`  | Sentry DSN for error tracking. |

## ESLint Configuration

The project uses ESLint with `typescript-eslint` for linting TypeScript code. The configuration is in the `eslint.config.mjs` file. It includes rules for React hooks and React Refresh.
