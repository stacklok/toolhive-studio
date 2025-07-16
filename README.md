## Note: This is an experimental project that is actively being developed and tested - features may change without notice

<p float="left">
  <picture>
    <img src="./icons/source-files/app-icons/mac/512.png" alt="ToolHive logo" height="100" align="middle" />
  </picture>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/toolhive-wordmark-white.png">
    <img src="docs/images/toolhive-wordmark-black.png" alt="ToolHive wordmark" width="500" align="middle" hspace="20" />
  </picture>
  <picture>
    <img src="docs/images/toolhive.png" alt="ToolHive mascot" width="125" align="middle"/>
  </picture>
</p>

[![Release][release-img]][release] [![Build status][ci-img]][ci]
[![License: Apache 2.0][license-img]][license]
[![Discord][discord-img]][discord]

# ToolHive - simplify and secure MCP servers

**Run any Model Context Protocol (MCP) server — securely, instantly, anywhere.**

ToolHive is the easiest way to discover, deploy, and manage MCP servers. Launch
any MCP server in a locked-down container with just a few clicks. No manual
setup, no security headaches, no runtime hassles.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/images/toolhive-ui-screenshot-dark.webp">
  <img src="./docs/images/toolhive-ui-screenshot-light.webp" alt="ToolHive screenshot" width="800" style="padding: 20px 0" />
</picture>

## Quick links

- 🚀 [Quickstart](#getting-started) - install ToolHive and run your first MCP
  server
  <!-- - 📚 [Documentation](https://docs.stacklok.com/toolhive/) -->
- 💬 [Discord community](https://discord.gg/stacklok) - connect with the
  ToolHive community, ask questions, and share your experiences
- 🛠️ [Developer guide](./docs/README.md) - build, test, and contribute to the
  ToolHive UI

---

<table>
<tr>
<td width="50%">

## Why ToolHive?

- **Instant deployment:** Start any MCP server with a simple graphical workflow.
- **Secure by default:** Every server runs in an isolated container with only
  the permissions it needs. Secrets are managed securely, never in plaintext.
- **Works everywhere:** Runs on Windows, macOS, or Linux.
- **Seamless integration:** ToolHive auto-configures popular clients like GitHub
  Copilot, Cursor, Claude Code, and more.

<br>
</td>
<td width="50%" align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/toolhive-sources-dark.svg">
    <img src="docs/images/toolhive-sources-light.svg" alt="ToolHive sources diagram" width="400px" />
  </picture>
</td>
</tr>
</table>

---

## Getting started

### Prerequisites

- [Docker](https://www.docker.com/) or [Podman](https://podman.io/) installed
  and running (Docker Desktop / Podman Desktop are recommended)
- If you are using Linux, make sure your user is in the `docker` group
  ([reference](https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user)).

### Install ToolHive

Download and install the latest release of the ToolHive for your platform:

- macOS (Apple Silicon):
  [download the DMG file](https://github.com/stacklok/toolhive-studio/releases/latest/download/ToolHive.dmg),
  open it, and drag the ToolHive app to your Applications folder.
- Windows:
  [download the installer](https://github.com/stacklok/toolhive-studio/releases/latest/download/ToolHive.Setup.exe)
  and run it.
  > [!NOTE]  
  > The Windows installer is not digitally signed yet, so you might need to
  > accept warnings from Windows Defender SmartScreen. We're working on getting
  > signing set up soon.
- Linux: download the RPM or DEB package from the
  [releases page](https://github.com/stacklok/toolhive-studio/releases/latest)
  and install it using your package manager.

### Run your first MCP server

The ToolHive UI has four main areas:

- **Installed**: View and manage your installed MCP servers.
- **Registry**: Browse and install servers from the curated registry of official
  and community servers.
- **Clients**: Automatically connect your favorite clients to MCP servers.
- **Secrets**: Securely manage sensitive data required by many MCP servers.

Start by installing a simple MCP server from the registry:

1. On the **Installed** tab, click **Add server** and choose **From the
   registry**. Or, open the **Registry** tab to browse available servers.

2. Select the "fetch" server from the list. Fetch is a simple MCP server that
   fetches data from the web.

   ![ToolHive registry](docs/images/quickstart-2.webp)

3. Click **Install server** to start the server.

4. Once the server is running, click **View** on the notification or open the
   **Installed** tab to see its status.

5. Open the **Clients** tab to connect your favorite client (e.g., GitHub
   Copilot, Cursor, Claude Code). For a list of supported clients, see the
   [ToolHive documentation](https://docs.stacklok.com/toolhive/reference/client-compatibility).

6. Open your client and start using the MCP server!

   ![Cursor MCP servers](docs/images/quickstart-7.webp)

---

## How it works

Under the hood, ToolHive runs each MCP server in its own secure container and
exposes an HTTP/SSE proxy that MCP clients connect to.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/toolhive-diagram-dark.svg">
  <img src="docs/images/toolhive-diagram-light.svg" alt="ToolHive diagram" width="800" style="padding: 20px 0" />
</picture>

For more advanced use cases, ToolHive is also available as a command-line tool
which can be used standalone or side-by-side with the ToolHive UI and as a
Kubernetes Operator. Learn more in the
[ToolHive documentation](https://docs.stacklok.com/toolhive/).

---

## Privacy and Telemetry

ToolHive uses [Sentry](https://sentry.io/) for error tracking and performance
monitoring to help us identify and fix issues, improve stability, and enhance
the user experience. This telemetry is enabled by default but completely
optional.

### What data is collected?

- Error reports and crash logs
- Performance metrics
- Usage patterns

### How to opt out

You can easily disable telemetry at any time:

1. Open ToolHive
2. Go to **Settings** (gear icon in the top navigation)
3. Find the **Telemetry** section
4. Toggle off telemetry collection

---

## Contributing

We welcome contributions and feedback from the community!

- 🐛 [Report issues](https://github.com/stacklok/toolhive-studio/issues)
- 💬 [Join our Discord](https://discord.gg/stacklok)
- 🤝 [Contributing guide](./CONTRIBUTING.md)
- 🛠️ [Developer guide](./docs/README.md)

If you have ideas, suggestions, or want to get involved, check out our
contributing guide or open an issue. Join us in making ToolHive even better!

---

## License

This project is licensed under the [Apache 2.0 License](./LICENSE).

<!-- Badge links -->
<!-- prettier-ignore-start -->
[release-img]: https://img.shields.io/github/v/release/stacklok/toolhive-studio?style=flat&label=Latest%20version
[release]: https://github.com/stacklok/toolhive-studio/releases/latest
[ci-img]: https://img.shields.io/github/actions/workflow/status/stacklok/toolhive-studio/on-main.yml?style=flat&logo=github&label=Build
[ci]: https://github.com/stacklok/toolhive-studio/actions/workflows/on-main.yml
[license-img]: https://img.shields.io/badge/License-Apache2.0-blue.svg?style=flat
[license]: https://opensource.org/licenses/Apache-2.0
[discord-img]: https://img.shields.io/discord/1184987096302239844?style=flat&logo=discord&logoColor=white&label=Discord
[discord]: https://discord.gg/stacklok
<!-- prettier-ignore-end -->

<!-- markdownlint-disable-file first-line-heading no-inline-html -->
