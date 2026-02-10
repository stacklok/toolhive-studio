# ADR-001: Deep Links in ToolHive Desktop

**Status:** Experimental

**Date:** 2025-06-01

## Context

ToolHive Studio needs a way for external systems (browsers, CLI tools, enterprise dashboards) to open the app and navigate to a specific view — for example, opening an MCP server detail page by name. This is commonly solved with custom protocol handlers (deep links).

Electron provides built-in protocol handler support via `app.setAsDefaultProtocolClient()`, but the actual implementation varies significantly across platforms and packaging formats. We surveyed deep link implementations in VS Code, GitHub Desktop, Rocket.Chat, Mattermost, Element, WebTorrent, Mailspring, BalenaEtcher, Electron Fiddle, and Museeks to understand common patterns and pitfalls.

### Key findings from prior art

**Platform differences:**

- **Windows:** Protocol handlers are registered in the Windows Registry. Deep links arrive via `process.argv` (cold start) or the `second-instance` event (warm start).
- **Linux:** Requires a `.desktop` file with `MimeType=x-scheme-handler/<protocol>`. Same argv/second-instance delivery as Windows.
- **macOS:** Uses Launch Services and the `open-url` event instead of argv. The OS enforces single-instance behavior natively.

**Packaging complications:**

- **Squirrel.Windows:** The binary path includes the version number (e.g. `app-1.2.3/ToolHive.exe`), which breaks protocol registration after auto-updates. The workaround is to register `Update.exe` as the protocol handler instead. Additionally, Squirrel's `--processStart` flag does not forward extra positional arguments — `--process-start-args` must be appended so that Squirrel forwards the deep link URL to the spawned process.
- **Flatpak:** Requires `desktop-file-edit` hacks in the build manifest to inject the MimeType into the sandboxed app's `.desktop` file.
- **Snapcraft:** Deep links are effectively broken due to a hardcoded protocol allowlist in snapd. Custom protocols require upstream changes to snapd itself.
- **AppImage / Tarballs:** `.desktop` files are not automatically installed; deep links only work if the user uses AppImageLauncher or manually installs the desktop file.
- **MSIX / AppX:** `setAsDefaultProtocolClient` has no effect; protocol association must be declared in the package manifest.
- **.deb / .rpm:** Work out of the box — package managers trigger desktop database updates automatically.

**Security patterns observed across apps:**

- **Action registry:** Most apps (GitHub Desktop, VS Code, Rocket.Chat) validate deep links against an allowlist of known actions rather than passing URLs through to the internal router.
- **URL sanitization:** Element strips the pathname from deep link URLs as a security measure. VS Code gates commands behind an allowlist. Rocket.Chat validates paths with regex.
- **Confirmation dialogs:** VS Code shows security confirmations before executing potentially destructive deep link actions.
- **argv injection:** Chromium may mangle argv entries on Windows. GitHub Desktop scans raw argv for protocol prefixes rather than relying on parsed arguments.

**Readiness patterns:**

- Multiple apps (BalenaEtcher, Electron Fiddle) use deferred execution patterns — queuing deep links until the renderer signals readiness via IPC.

## Decision

### URL schema

Deep links use a versioned, intent-based URL schema:

```
toolhive-gui://<version>/<intent>[?<params>]
```

Example: `toolhive-gui://v1/open-registry-server-detail?serverName=fetch`

The URL is parsed using the standard `URL` constructor — the version maps to `url.host`, the intent to `url.pathname`, and parameters to `url.searchParams`.

### Intent-based architecture, not router passthrough

Deep links express **intent** (e.g. `open-registry-server-detail`) rather than mapping directly to internal routes. This provides:

- **Security:** Only explicitly declared intents are reachable via deep links, preventing access to arbitrary internal state.
- **Stability:** Internal routes can change without breaking existing deep links in the wild.
- **Portability:** The same intent identifiers could be used in CLI tools or other apps in the future.
- **Telemetry:** Intent names provide natural, meaningful event names.

### Schema-based validation with Zod

Deep link definitions are co-located as Zod schemas that declare the intent name, parameter schema (with sanitization via regex), and navigation handler. The `deepLinkSchema` is a discriminated union over all registered intents. Invalid or unknown deep links are rejected at parse time.

Parameters are validated with restrictive patterns (e.g. `safeIdentifier = /^[a-zA-Z0-9_.-]+$/`) to prevent injection attacks.

### Simplified IPC model

The main process resolves deep links to a `NavigateTarget` (`{ to, params }`) and sends a single `deep-link-navigation` IPC message to the renderer. The renderer calls `router.navigate(target)` without any knowledge of deep link definitions.

This is simpler than the three-message model (ready/dispatch/error) originally considered in the design document, because:

- The main process already tracks window readiness via `waitForMainWindowReady()`.
- Invalid deep links navigate to a non-existent route, which triggers the router's `notFoundComponent` — no separate error channel needed.

### Platform and packaging support

**Supported:**

- Windows: Squirrel (with `Update.exe` + `--process-start-args` workaround)
- macOS: `.dmg`, Homebrew (via `protocols` in `packagerConfig` + `open-url` event)
- Linux: `.deb`, `.rpm` (via `mimeType` in maker config), Flatpak (with TODO for desktop-file-edit hooks)

**Explicitly not supported:**

- Snapcraft — blocked by snapd's hardcoded protocol allowlist
- Portable distributions (AppImage, tarball) — no automatic `.desktop` file installation
- MSIX / AppX — requires manifest declarations we don't currently produce

### Second instance handling

When a second instance is launched (e.g. by clicking a deep link while the app is running), the second instance extracts the deep link URL from argv, then immediately calls `process.exit(0)`. The first instance receives the URL via the `second-instance` event and handles it.

`process.exit(0)` is used instead of `app.quit()` because `quit()` is async — its lifecycle events allow `app.whenReady()` to fire, briefly creating a visible window before exiting.

### Error handling

Invalid or unparseable deep links navigate the renderer to a non-existent route (`/deep-link-not-found`), which triggers TanStack Router's `notFoundComponent`. No dedicated error UI is needed for the PoC.

### Non-goals in the current phase

- CLI deep links
- Universal Links (Safari-only, limited value)
- Snapcraft support
- Backend-generated deep links
- Deep link telemetry (can rely on existing page view tracking)
- Confirmation dialogs for destructive operations (PoC only supports read operations)

## Consequences

### Positive

- Deep links work across all primary distribution channels (Squirrel, .dmg, .deb, .rpm).
- The intent-based architecture prevents deep links from accessing arbitrary internal state.
- Schema validation with Zod catches malformed URLs early and prevents parameter injection.
- The single-IPC-message design keeps the renderer simple — it has no knowledge of deep link definitions.
- Adding new deep link intents requires only adding a new entry to the `allDeepLinks` array in `common/deep-links.ts`.

### Negative

- Snapcraft users on Ubuntu cannot use deep links. This is a platform limitation we cannot work around.
- Portable distribution users (AppImage, tarball) need manual setup for deep links to work.
- The `notFoundComponent` approach for errors means we cannot show a specific "invalid deep link" message — just the generic not-found page.
- Cold-start deep links depend on `waitForMainWindowReady()` polling, which may need to be replaced with an explicit renderer readiness signal if timing issues arise.

### Risks

- Squirrel.Windows auto-updates could regress deep link registration if the `Update.exe` path resolution breaks. The `--process-start-args` workaround is not well-documented by Squirrel.
- Flatpak support is declared but may need build hook adjustments (`desktop-file-edit`) that have not been fully tested.
