# ToolHive developer guide

This is the front-end for ToolHive, an Electron application built with React,
TypeScript, and Vite.

## Getting started

This project uses [pnpm](https://pnpm.io/) as the package manager.

It is recommended to use a Node.js version manager like `nvm` or `fnm`. The
required Node.js version is specified in the `.nvmrc` file (which points to the
latest LTS version).

> [!IMPORTANT] Make sure the Docker daemon is running before you start, as it is
> required by ToolHive.

To get started, follow these steps:

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Make sure thv is downloaded and runs properly**:

   ```bash
   pnpm thv
   ```

   This command needs to be run once to build the application before starting
   the development server.

3. **Start the development server**:

   ```bash
   pnpm run start
   ```

   This will start the Electron application with hot reload for the renderer
   process.

## Available scripts

Here are the most common scripts you will use during development:

- `pnpm run start`: Starts the development server with hot reload.
- `pnpm run lint`: Lints the code using ESLint.
- `pnpm run format`: Formats the code with Prettier.
- `pnpm run type-check`: Runs TypeScript type checking.
- `pnpm run test`: Runs tests using Vitest.
- `pnpm run test:coverage`: Runs tests with coverage.
- `pnpm run thv`: Run the same `thv` binary that the dev server uses

### Building and packaging

- `pnpm run package`: Packages the application for the current platform.
- `pnpm run make`: Creates distributable packages for the application.

### API client generation

- `pnpm run generate-client`: Fetches the latest OpenAPI specification and
  generates the API client.
- `pnpm run generate-client:nofetch`: Generates the API client from the existing
  local OpenAPI specification.

## Project structure

The project is structured as a typical Electron application:

- `main/`: Contains the code for the Electron main process.
- `preload/`: Contains the preload scripts for the Electron renderer process.
- `renderer/`: Contains the React application for the renderer process. This is
  where the UI components live.

## Environment variables

> [!IMPORTANT]  
> Electron applications can be decompiled, so do not store sensitive information
> in runtime environment variables. Use secure methods to handle sensitive data.

The project uses environment variables for configuration.

You can set these in a `.env` file in the root directory when developing
locally. The `.env.example` file provides a template for the required variables.

For building and deploying the application, these should be configured in Github
actions secrets/variables (as appropriate).

To expose environment variables at _**run time**_, you need to prefix them with
`VITE_`. This will make them available on `import.meta.env` (**not**
`process.env`))

For example, if you want to expose a variable named `API_URL`, you should define
it as `VITE_API_URL` in the `.env` file (locally) or in the CI environment.

| Variable                    | Required | Build-time | Run-time | Description                                                                                           |
| --------------------------- | -------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `VITE_SENTRY_DSN`           | `false`  | `true`     | `true`   | Sentry DSN. The URL that events are posted to.                                                        |
| `VITE_ENABLE_AUTO_DEVTOOLS` | `false`  | `false`    | `true`   | Enable automatic opening of DevTools in development mode. Set to `true` to enable.                    |
| `SENTRY_AUTH_TOKEN`         | `false`  | `true`     | `false`  | Sentry authentication token. Used for sourcemap uploads at build-time to enable readable stacktraces. |
| `SENTRY_ORG`                | `false`  | `true`     | `false`  | Sentry organization. Used for sourcemap uploads at build-time to enable readable stacktraces.         |
| `SENTRY_PROJECT`            | `false`  | `true`     | `false`  | Sentry project name. Used for sourcemap uploads at build-time to enable readable stacktraces.         |

## Code signing

Supports both macOS and Windows code signing. macOS uses Apple certificates,
Windows uses DigiCert KeyLocker for EV certificates.

### Local development

#### macOS

Optional: Set `MAC_DEVELOPER_IDENTITY` in `.env` to use a specific certificate:

```text
MAC_DEVELOPER_IDENTITY="Developer ID Application: Your Name (TEAM123)"
```

Local signing is not required for development.

### CI/CD

#### macOS Signing

Requires these GitHub secrets:

- `APPLE_CERTIFICATE` - Base64 encoded .p12 certificate
- `APPLE_CERTIFICATE_PASSWORD` - Certificate password
- `KEYCHAIN_PASSWORD` - Temporary keychain password
- `APPLE_API_KEY` - Base64 encoded .p8 API key
- `APPLE_ISSUER_ID` - Apple API Issuer ID
- `APPLE_KEY_ID` - Apple API Key ID

#### Windows Signing (DigiCert KeyLocker)

Requires these GitHub secrets for EV certificate signing:

- `SM_HOST` - DigiCert KeyLocker host URL
- `SM_API_KEY` - DigiCert KeyLocker API key
- `SM_CLIENT_CERT_FILE_B64` - Base64 encoded client certificate (.p12)
- `SM_CLIENT_CERT_PASSWORD` - Client certificate password
- `SM_CODE_SIGNING_CERT_SHA1_HASH` - SHA1 fingerprint of the code signing
  certificate

CI auto-detects the certificates. Apps are signed automatically during the build
process.

## ESLint configuration

The project uses ESLint with `typescript-eslint` for linting TypeScript code.
The configuration is in the `eslint.config.mjs` file. It includes rules for
React hooks and React Refresh.

## Code of conduct

This project adheres to the [Contributor Covenant](../CODE_OF_CONDUCT.md) code
of conduct. By participating, you are expected to uphold this code. Please
report unacceptable behavior to
[code-of-conduct@stacklok.dev](mailto:code-of-conduct@stacklok.dev).

---

## Contributing

We welcome contributions and feedback from the community!

- 🐛 [Report issues](https://github.com/stacklok/toolhive-studio/issues)
- 💬 [Join our Discord](https://discord.gg/stacklok)
- 🤝 [Contributing guide](../CONTRIBUTING.md)

If you have ideas, suggestions, or want to get involved, check out our
contributing guide or open an issue. Join us in making ToolHive even better!

---

## License

This project is licensed under the [Apache 2.0 License](./LICENSE).
