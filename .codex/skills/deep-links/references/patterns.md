# Observed Patterns in Deep Link Implementations

_Part of the [deep-links skill](../SKILL.md). Documents patterns observed in VS Code, GitHub Desktop, Mattermost, Element, and other open-source Electron apps. This is research — some patterns are adopted in our implementation, others are noted for future reference._

---

### Observed patterns {#observed-patterns}

#### **Landing pages** {#landing-pages}

Some apps such as Mattermost have a linking system where they have a browser-based “landing page” for all links. Example:  
https://community.mattermost.com/core/channels/town-square

When opening such a link in your browser, you get the choice between opening the link directly in the browser or opening it in a desktop app. The desktop app is a protocol-hander based deep link such as:  
mattermost://[community.mattermost.com/core/channels/town-square](http://community.mattermost.com/core/channels/town-square)

Interestingly, the landing page (at least in the case of Mattermost) is designed to remember your choice to use the browser app.

#### **Protocol-specific flags**

VS-Code uses the following mechanism to tag protocol-related invocation using CLI flags:

```ts
app.setAsDefaultProtocolClient(protocol, process.execPath, [
  '--open-url', // Distinguishes protocol invocation
  '--', // Separator for URL argument
])
```

Albeit it’s unclear if this will also work on MacOS, since protocol handlers do not rely on process.argv in that case.

#### **Windows registry hacks**

WebTorrent bypasses Electron's setAsDefaultProtocolClient and writes directly to Windows Registry via winreg package for finer control.

#### **URL-parsing** {#url-parsing}

Since deep links involve process.argv, additional flags can interfere. For instance if the code simply assumes that the URL is located in process.argv\[3\], then a certain fragility is introduced in the codebase. For instance, the build system or Electron might change what other flags are injected, or even 3rd party packagers or operating systems can break things.

On Windows, Chromium may inject additional command-line arguments (like \`--allow-file-access-from-files\`) that break standard argument parsers like minimist or yargs. For example, a URL like \`x-github-client://oauth?code=123\` can be mangled into \`--allow-file-access-from-files=x:/github-client\` due to Chromium's argument parsing behavior.

Most of the apps examined implemented a workaround. For instance GitHub Desktop scans raw \`process.argv\` for URLs matching known protocol prefixes instead of relying on parsed arguments:

```ts
const prefixes = ['x-github-client://', 'github-windows://']
const protocolUrl = process.argv.find((arg) =>
  prefixes.some((p) => arg.startsWith(p))
)
```

#### **Waiting for readiness** {#waiting-for-readiness}

Multiple apps, such as BalenaEtcher and Electron Fiddle use some patterns, such as promises declared as global variables, as a method to defer deep link execution until the conditions are right. This is something that we will have to implement, since most deeplink operations will probably depend on thv running.

Here’s an example code:

```ts
// Main process waits for renderer to signal ready
let sourceSelectorReady: Promise<void>
ipcMain.once('source-selector-ready', resolve)

// Then sends the URL
await sourceSelectorReady
window.webContents.send('select-image', url)
```

#### **Security/safety confirmations**

Some apps, such as VS-Code use security confirmations before an operation (such as opening a file) is triggered by a deep link. It is probably best to bake this confirmation system into the deep link system instead of making security decisions on a case-by-case basis in order to keep things simple and avoid accidentally introducing security issues.

In our case, it might make sense to differentiate between C/R/U/D operations, R operations should be generally safe, since assuming general safety precautions, those cannot leak information back to the linker and cannot trigger destructive operations. All other operations should require at least a safety confirmation.

#### **URL sanitization**

Element implements a strict URL sanitization logic. Deep links do not connect directly to the internal router, and thus deep links cannot be used to access any random internal state and potentially cause bugs or bypass security boundaries.

The way Element does this is by ignoring the pathname:

```ts
private processUrl(url: string): void {
  const parsed = new URL(url);
  const urlToLoad = new URL("vector://vector/webapp/");

  // Only preserve search (for SSO) and hash (for deep links)
  // Strip pathname to prevent loading internal pages like Jitsi wrapper
  urlToLoad.search = parsed.search;
  urlToLoad.hash = parsed.hash;
  // pathname is NOT copied - security measure

  void global.mainWindow.loadURL(urlToLoad.href);
}
```

Explicit action registry (GitHub Desktop):

```ts
switch (parsedUrl.hostname.toLowerCase()) {
  case 'oauth': return { name: 'oauth', code, state };
  case 'openrepo': return { name: 'open-repository-from-url', ... };
  default: return { name: 'unknown', url };  // Dropped
}
```

Path regex validation (Rocket.Chat):

```ts
if (!/^\/?(direct|group|channel|livechat)\/[0-9a-zA-Z-_.]+/.test(path)) {
  return // Invalid paths rejected
}
```

VS Code command gating:

```ts
if (!options?.allowCommands) return true // Block by default
if (
  Array.isArray(options.allowCommands) &&
  !options.allowCommands.includes(target.path)
) {
  return true // Not in allowlist
}
```

Sanitization is pretty important. For instance, VS-Code had a remote code execution vulnerability in the past due to the Deep Links feature: [https://www.sonarsource.com/blog/securing-developer-tools-argument-injection-in-vscode/](https://www.sonarsource.com/blog/securing-developer-tools-argument-injection-in-vscode/)

So these are the 2 important aspects of sanitizing URLs:

- Controlling what internal (router) state can actually be accessed through deep links, such as by allow-listing specific URLs
- Beyond this, we also have to sanitize parametric parts of the URL, including the search and hash, and not assume that they are safe to import into local state

#### **Passthrough URLs vs. separate system for deep links**

Out of the examined apps, only Element actually passes deeplinks right through to their internal router state, but even they only pass the hash part directly through \- and ignore the pathname. The other apps implement some sort of intermediary system-router that parses/validates a limited set of valid deep links, and converts them into the appropriate internal state.

This additional layer does not only provide greater security but allows for the creation of a more future-proof deep linking system: we maintain freedom to move our internal routes around without having to worry about coordinating with existing on-prem deployments of the Enterprise UI.

#### **Telemetry & logging**

Seems like none of the apps have telemetry specifically about deep links \- they simply track the action that they deep link triggered. However some apps do log events or errors related to deep links.
