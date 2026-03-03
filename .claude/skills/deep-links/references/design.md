# Deep Links Design: Suggestions, Decisions & PoC

*Part of the [deep-links skill](../SKILL.md). Contains design rationale, finalized decisions, and the minimal proof of concept scope. **Some sections describe planned future behaviour not yet implemented** — see the base skill for what is currently in the codebase.*

---

## Suggestions for Toolhive

### Platforms and packaging

Windows, MacOS and Linux should all be supported. Packaging wise we should focus on supporting:

* Squirrel (Windows)  
* .dmg and Homebrew (MacOS)  
* Flatpak/Flathub, .deb, .rpm (Linux)

The following should be explicitly excluded:

* Snapcraft (Linux) \- basically not possible today due to technical reasons, but can be revisited once the app becomes very popular

Regarding portable builds (AppImage, Tarball, etc), we can consider the following options:

* Add an “Open Link” feature, where the user can copy-paste the deep link. This could also be useful for testing purposes  
* Add “hacks” to still register the protocol handler. On Windows this would involve overriding registry, on Linux, simply generating a .desktop files and calling some OS API to trigger the database being rebuilt. B**ut we should only ever do this with the user’s consent, because for many users this would break the “spirit” of portable apps.**

In any case, it is probably not urgent to solve those in the first phase, but it’s good to keep them in mind.

We can rely on prior work to establish an initial implementation of any platform/packaging specific “hacks”.

### Deep link service(s) in Toolhive Studio

#### **No direct connection to internal router** {#no-direct-connection-to-internal-router}

I suggest that we do not write deep links directly into the internal router. The main reasoning:

* Deep links involve multiple systems that are interdependent (different on prem deployments vs. different local versions). We do not want the limiting effects of this interdependence to spread to core areas of the app such as routing. Using a separate layer with stable identifiers is a good way to avoid this issue.  
* Security implications  
* This created the potential for making deep links that work the same way both in GUI and CLI, or can even be handled by different apps if we decide to make different apps in the future  
* This will automatically give us usable telemetry event names  
* Passthrough URLs are just not a pattern I have seen widely used in the applications I examined

Instead, the app should only respond to deep links that have been specifically declared. And the declaration of deep links should control their behavior.

#### **Intent instead of resource**

We should not think of deep links as being simply a reference to a resource in the applications. Instead I suggest that deep links should express intent such as:

- Run-server  
- Set-registry  
- Open-logs

#### **Parsing, validation, security and execution** {#parsing,-validation,-security-and-execution}

I suggest that we use a schema-based parsing (zod or similar) to parse deep links, which would also inherently validate them. This layer should be responsible for additional security layers, such as sanitizing parameters to prevent code execution. 

A more general sanitization can be employed pre-parsing, such as banning certain special characters or detecting injection patterns.

Parsed intents should be converted into an action, but what type of action they are allowed to be converted into should depend on the type of CRUD operation they implement:

* C**R**UD operations (Read operation): converted directly into a navigation event in the internal router and nothing else \- might still be temporarily blocked if user has unsaved changes that would be destroyed by following the link  
* **C**R**UD** operations (Potentially destructive operations): these operations should be handled by custom callbacks, however the callbacks should be automatically wrapped in a generic confirmation system. The confirmation system would inform the user about the operation they are about to perform and ask for their confirmation. This should be hard-wired into the system, but the React component that is displayed to the user should be customizable  
* Display generic errors for invalid links

Deep links are executed using IPC, so the main process will process deep links, parse and sanitize them and transmit them to the renderer using an IPC call. **All kinds of deep links need to be executed in the renderer process**: read operations because they need access to the router, and all other operations because they need user confirmation.

The IPC contract should have the following calls:

- Deeplink:ready \- sent by the renderer to the main process to signal that it’s ready to receive links  
- Deeplink:dispatch \- sent by the main process to renderer. It contains a sanitzed, parsed deep link  
- Deeplink:dispatchError \- show an error message about an invalid deeplink

#### **Queue management**

We will likely not need sophisticated queue management in the beginning, but race conditions will apply. Still, our major issue will be that the app needs to be fully loaded before we can handle deep links. So a single item “queue” is enough to solve this \- and this is a [common pattern seen in other applications](#waiting-for-readiness). 

#### **URL schema**

I suggest that we employ a simple schema that will simplify the URL parsing:

toolhive-gui://\<intent\>\[?\<query\]

Some examples:

* toolhive-gui://v1/open-registry *Open registry page*  
* toolhive-gui://v1/run-local-server?serverName=fetch *Run the fetch server locally from the registry*

This way we avoid complex logic for parsing the path.

#### **URL extraction from argv**

On Windows and Linux, we will need to rely on argv to access the deep-link URL. This presents some problems due to [argv injection](#url-parsing). If we use [schema-based parsing](#parsing,-validation,-security-and-execution), then filtering argv for matching items is a straightforward and safe solution to avoid problems.

#### **Telemetry**

We can implement deep-link specific telemetry using Sentry breadcrumbs. As described [in this section](#no-direct-connection-to-internal-router), event names would provide a reasonable level of detail, because the actual events (such as running a server) can contain all other details.

#### **Error handling**

The main scenarios where errors can happen are the following:

- Invalid deeplink opened/deep link cannot be parsed \-\> handled by Deeplink:dispatchError call  
- “Read” link targets a non-existent page \-\> Handled by standard 404 handling  
- Other operation triggered by link \-\> handled by custom handler; when custom handler does not exist, handled by error boundary in the wrapper logic (does not lead to crashing the app)

#### **Testing approach**

Unfortunately, there is no simple, OS-independent way to trigger deep-links in Playwright. Attempting to make end-to-end testing work would not have a good return on investment.

Instead, we will have to unit test the parsing logic, and use unit test/component tests in order to test the IPC handling in the renderer process.

In a limited fashion, a simple manual testing method can be used to test how deep links are handled:  
  ./node\_modules/.bin/electron . "toolhive://v1/open-group?groupName=default"     

## Decisions

### MDM/Enterprise installation

Needs further clarification \- we need to know more about the requirements.

### Packaging

Supported in initial phase

* Windows: Squirrel  
* macOS: .dmg, Homebrew  
* Linux: .deb, .rpm, Flatpak

Explicitly not supported in initial phase:

- Snapcraft (due to technical limitations)  
- Portable distributions (AppImage, tarball)

### Simplified IPC model & Error handling

The main process is already aware of the app readiness, so communication between the two processes is not required in order to establish readiness. The main process already has all the information it needs in order to decide when to send the pre-sanitized/pre-parsed.

We do not need specific error handling today: we can use a generic error route in order to handle errors. So, invalid/unparseable deep links can generate a router navigation event that leads to this simple error route.

This way, only a single type of IPC message is enough to implement the entire system.

###  Telemetry

Not a P0 concern. Can be ignored for the first PoC

### Non-goals in the current phase

- CLI deep links  
- Universal Links   
- Snapcraft support  
- Backend-generated deep links

### Next steps

Build a minimal PoC as described in the [Minimal proof of concept](#minimal-proof-of-concept) section.

## Minimal proof of concept {#minimal-proof-of-concept}

- Open MCP server detail page by server name  
