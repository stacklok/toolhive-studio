---
name: deep-links
description: Deep links in ToolHive Studio. Use when implementing, debugging, or asking about deep link features (toolhive-gui:// protocol), adding new deep link intents, understanding the deep link architecture, IPC model, or platform/packaging support.
allowed-tools: Read, Grep, Glob, Bash
---

# Deep Links in ToolHive Studio

Deep links allow external systems (browsers, terminals, other apps) to trigger navigation inside ToolHive Desktop via the `toolhive-gui://` custom protocol.

> **About this document**: Much of the content in the reference docs is the result of research into how other Electron apps implement deep links. Some design decisions are implemented; others describe the intended direction but are not yet in the codebase. The base skill reflects the current implementation. The reference docs reflect the research and design intent — read them with that in mind, and update them when relevant implementation decisions change.

---

## URL Schema

```
toolhive-gui://v1/<intent>[?<query>]
```

Examples:
- `toolhive-gui://v1/open-registry-server-detail?serverName=fetch` — open a registry server detail page

The `v1` segment is the version. The intent is a kebab-case action name. Query params carry intent-specific data.

---

## Current Implementation

### Key Files

| File | Role |
|---|---|
| `common/deep-links.ts` | **Single source of truth.** All deep link definitions: intent name, Zod param schema, navigation target. |
| `main/src/deep-links/parse.ts` | Parses and validates a raw URL string using the schemas from `common/deep-links.ts`. |
| `main/src/deep-links/index.ts` | Entry point: extracts URL from argv (Windows/Linux), waits for window ready, dispatches via IPC. |
| `main/src/deep-links/squirrel.ts` | Squirrel.Windows-specific protocol registration. |

### IPC Channel

`deep-link-navigation` — sent **main → renderer** as a `NavigateTarget` (`{ to: string; params?: Record<string, string> }`).

The renderer receives this and calls the TanStack Router `navigate()` directly.

### How It Works (Current)

1. **Protocol registration**: On app start, `app.setAsDefaultProtocolClient('toolhive-gui')` registers the protocol. On Windows with Squirrel, `registerProtocolWithSquirrel()` is called instead (see `squirrel.ts`).
2. **URL extraction**: On Windows/Linux, the URL arrives in `process.argv`. `extractDeepLinkFromArgs()` scans for the first `toolhive-gui://` argument (safe against argv injection — see [patterns doc](references/patterns.md#url-parsing)).
3. **Parse + validate**: `parseDeepLinkUrl()` parses the URL and runs it through the Zod discriminated union schema defined in `common/deep-links.ts`. Invalid links resolve to `showNotFound`.
4. **Window ready**: `waitForMainWindowReady()` polls until the window is visible and not loading before dispatching.
5. **Dispatch**: `resolveDeepLinkTarget()` converts the validated intent to a `NavigateTarget`, which is sent to the renderer via the `deep-link-navigation` IPC channel.
6. **Renderer**: The renderer listens for `deep-link-navigation` and calls `navigate(target)`.

### Current Limitations vs. Design Intent

The current implementation only supports **read (navigate) operations**. The design doc proposes a confirmation flow for write/destructive operations (C/U/D), but this is not yet implemented. The IPC sends a pre-resolved `NavigateTarget` rather than a raw parsed intent — this simplified the initial implementation. See [design doc](references/design.md) for the full intended model.

---

## How to Add a New Deep Link

All changes happen in **`common/deep-links.ts`**:

```ts
// 1. Define the new intent using v1DeepLink()
export const myNewIntent = v1DeepLink({
  intent: 'my-new-intent',           // kebab-case, matches URL path segment
  params: z.object({
    someParam: safeIdentifier,        // use safeIdentifier for user-supplied strings
  }),
  navigate: (params) => ({
    to: '/some-route/$id',            // TanStack Router route
    params: { id: params.someParam },
  }),
})

// 2. Add to allDeepLinks array
const allDeepLinks = [openRegistryServerDetail, showNotFound, myNewIntent] as const

// 3. Add to deepLinkSchema discriminated union
export const deepLinkSchema = z.discriminatedUnion('intent', [
  openRegistryServerDetail.schema,
  showNotFound.schema,
  myNewIntent.schema,               // ← add here
])
```

**Test manually:**
```bash
./node_modules/.bin/electron . "toolhive-gui://v1/my-new-intent?someParam=value"
```

> `safeIdentifier` is defined as `z.string().regex(/^[a-zA-Z0-9_.-]+$/)` — use it for any param that could be user-supplied to prevent injection.

---

## Reference Documents

For deeper background, see:

- **[OS & Packaging Support](references/os-and-packaging.md)** — Platform-specific registration requirements (Windows, Linux, macOS) and packaging format considerations (Squirrel, Flatpak, .deb, .rpm, .dmg, AppImage, MSIX, etc.). Largely research/prior art.
- **[Observed Patterns](references/patterns.md)** — Patterns from VS Code, GitHub Desktop, Mattermost, Element, and others: URL sanitization, argv injection, security confirmations, waiting-for-readiness patterns, telemetry.
- **[Design & Decisions](references/design.md)** — Full design rationale, IPC model, error handling strategy, queue management, testing approach, and the decisions log. Some sections describe planned future behaviour not yet implemented.
