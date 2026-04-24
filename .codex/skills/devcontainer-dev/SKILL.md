---
name: devcontainer-dev
description: Spin up and interact with ToolHive Studio's containerized dev environment (Xvfb + noVNC + DinD). Use when running, testing, or debugging the app in isolation — locally, in a git worktree, or in GitHub Codespaces; when touching `.devcontainer/*`, `scripts/devcontainer-*.sh`, or the `devContainer:dev` npm script; or when debugging "blank white window", "Docker daemon failed to start", or "Missing X server" errors in the devcontainer. The container is fully isolated: no host pnpm install, no host Docker socket, no host X11/GPU — experiment freely without contaminating the host.
allowed-tools: Read, Grep, Glob, Bash
---

# Containerized Dev Environment

An isolated, cross-platform test environment for ToolHive Studio. The whole Electron app — including its backend `thv` binary and the MCP-server containers it spawns — runs inside a single devcontainer. You interact with the UI via a noVNC browser tab.

The entire stack (Node, Electron, display server, window manager, VNC server, Docker-in-Docker, DBus, keyring) lives in the container. **Nothing is installed on the host.** That's the whole point: every worktree can have its own container and its own experiments, with zero risk of contaminating the user's global installs.

---

## Entry point

```
pnpm devContainer:dev
```

runs `scripts/devcontainer-dev.sh` on the host. The script is "smart":

- If executed on the host: runs `devcontainer up` to build/start the container, then `devcontainer exec` to run the entrypoint inside it.
- If executed inside a container (detected via `/.dockerenv`): skips the build step and just runs the entrypoint directly. This path is used by GitHub Codespaces.

---

## The three scripts

| Script                                     | Runs on      | Purpose                                                                                                                            |
| ------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/devcontainer-dev.sh`              | host         | Picks a host port, kills stale processes, starts readiness poller, opens browser when ready, `devcontainer exec`s the entrypoint. |
| `scripts/devcontainer-entrypoint.sh`       | in container | Cleans stale X/VNC state, starts Xvfb, fluxbox, x11vnc, websockify/noVNC, dbus, gnome-keyring, then runs `pnpm start`.             |
| `scripts/devcontainer-post-start.sh`       | in container | `postStartCommand` in `devcontainer.json`. In Codespaces (detected via `$CODESPACES`) it `nohup`-launches the entrypoint in the background so the noVNC preview pane opens without user action. |

---

## What the container runs

- **Node 24** (matches `.nvmrc`)
- **Electron + runtime deps** — GTK, NSS, X11, etc. (see `.devcontainer/Dockerfile`)
- **Display stack** — Xvfb (virtual framebuffer at 1920×1200), fluxbox (window manager, auto-fullscreens windows with `WM_CLASS=ToolHive`), x11vnc (VNC server), noVNC + websockify (browser client on port 6080)
- **Secret provider stack** — dbus + gnome-keyring. Required by ToolHive's secret API; without them the backend returns 500 on secrets endpoints. Mirrors the setup in `.github/workflows/_e2e.yml`.
- **Docker-in-Docker** via the `docker-in-docker:2` devcontainer feature. Supplies `/var/run/docker.sock` inside the container so the bundled `thv` CLI can spawn MCP-server containers.

---

## Finding the URL (the logs are very long)

`pnpm start` + electron-forge + Vite + Electron + HMR produce a **lot** of output. The terminal scrollback often exhausts. Three recovery mechanisms are built in:

1. **Written to a file** by the launcher: `~/.cache/toolhive-studio-url`. Survives any amount of output.
   ```bash
   cat ~/.cache/toolhive-studio-url
   ```
2. **Set as the terminal tab title** via OSC escape. Visible in the tab bar of most terminals regardless of scrollback state.
3. **Prominent banners** in the output — a green initial block right after `devcontainer up`, plus an inverse-video `✓ ToolHive ready — <URL>` banner that fires only once the app is actually usable.

If you're piping the output:

```bash
pnpm devContainer:dev 2>&1 | tee /tmp/dev.log
# later:
grep -E 'ToolHive ready|vnc\.html' /tmp/dev.log
```

The readiness banner is what you care about. It gates on **three** signals simultaneously:
- noVNC's HTTP endpoint answers (the browser tab will actually load)
- The Electron binary is running (matched via `pgrep -f 'electron/dist/electron'`)
- `thv serve` is running (matched via `pgrep -f 'thv serve'` — *not* `pgrep -x thv`, because the short-lived version-check invocation also matches on bare name)

Only once all three are true does the banner fire and the host's browser auto-open.

---

## Per-worktree isolation

Each git worktree gets its own independent devcontainer:

- **Container identity** — labelled with `devcontainer.local_folder=<absolute-worktree-path>`. The devcontainer CLI uses this to decide which container to reuse vs create fresh.
- **Node modules** — volume named `toolhive-node-modules-<basename>`, scoped to the worktree's basename. No cross-worktree install pollution.
- **Host port** — the primary clone uses `:6080`; additional worktrees try `:6080` first and fall back to a Docker-assigned random port if it's taken. So multiple worktrees can run simultaneously. The actual bound port is queried with `docker port "$CONTAINER_ID" 6080/tcp` and the URL is generated from that.
- **DinD, display state, keyring, etc.** — all container-local. Tearing down a worktree's container removes all of it.

**The host is never touched** — no host-side `pnpm install`, no host-side `/tmp/.X11-unix` mount, no host-side Docker socket passthrough, no host GPU. Everything the app needs is inside the container. Even the NVIDIA driver on the host is unreachable from inside — the container uses CPU software rendering.

---

## Interacting with a running container

Find the container ID for a given worktree:

```bash
WORKDIR="$(pwd)"   # or a specific worktree path
CONTAINER=$(docker ps --filter "label=devcontainer.local_folder=$WORKDIR" --format '{{.ID}}' | head -1)
```

Common operations:

```bash
# Shell in
docker exec -it "$CONTAINER" bash

# Run as the devcontainer user (usually correct for pnpm / thv commands)
docker exec -u node "$CONTAINER" pnpm test

# One-off inspection
docker exec "$CONTAINER" ps auxf

# DinD health
docker exec "$CONTAINER" docker info
docker exec "$CONTAINER" docker ps
```

### Log files (written by the entrypoint)

| Path                    | Contents                                          |
| ----------------------- | ------------------------------------------------- |
| `/tmp/xvfb.log`         | Xvfb startup and runtime errors                   |
| `/tmp/fluxbox.log`      | Window manager                                    |
| `/tmp/x11vnc.log`       | VNC server — includes client connection events    |
| `/tmp/websockify.log`   | noVNC WebSocket proxy                             |
| `/tmp/keyring.log`      | gnome-keyring-daemon unlock output                |
| `/tmp/entrypoint.log`   | Output of the Codespaces auto-launch entrypoint (only exists in Codespaces) |

### Killing stale state

If the app gets wedged, the entrypoint's first action on every run is to pkill all the usual suspects. To do it manually:

```bash
docker exec "$CONTAINER" bash -c '
  pkill -f "electron/dist/electron"; pkill -f "thv serve"
  pkill -f Xvfb; pkill -f fluxbox; pkill -f x11vnc; pkill -f websockify
  rm -f /tmp/.X99-lock /tmp/.X11-unix/X99
'
```

---

## Gotchas

### Docker daemon won't start (Linux, non-stock kernels)

Symptom: `(*) Failed to start docker, retrying...` in a loop; `thv` has no runtime; `dockerd.log` contains:

```
failed to create NAT chain DOCKER: iptables failed: ...
can't initialize iptables table `nat': Table does not exist (do you need to insmod?)
```

Seen on **zen, hardened, XanMod, and other non-stock Linux kernels** that don't autoload iptables modules. Fix (on the host):

```bash
sudo modprobe iptable_nat iptable_filter ip_tables
```

Persist across reboots:

```bash
echo -e "iptable_nat\niptable_filter\nip_tables" | sudo tee /etc/modules-load.d/docker.conf
```

A complete explanation is in a comment block in `.devcontainer/devcontainer.json` directly above the `docker-in-docker` feature declaration. Mac, Windows/WSL2, Codespaces, and stock Ubuntu/Debian/Fedora are unaffected.

### Electron renders a blank white page

Root cause: Docker's default `/dev/shm` is 64 MB, too small for Chromium's compositor buffers; it fails silently and paints nothing.

This is already fixed in the setup:
- `runArgs` has `--shm-size=2g` to grow the shared memory
- The entrypoint launches Electron with `--disable-dev-shm-usage` so Chromium falls back to `/tmp` anyway

If you're modifying the startup flags, keep these.

### Fluxbox fullscreen rule doesn't match

The Electron main window's `WM_CLASS` is `ToolHive`, **not** `Electron`. The `~/.fluxbox/apps` file the entrypoint generates targets `(class=ToolHive)` for that reason. The `Electron`-classed windows that show up in `xwininfo` are tiny 16×16 internal helper windows — ignore them.

### Readiness false-positive

`pgrep -x thv` would match the short-lived `thv version` / `thv --version` invocation that Electron runs during startup to verify the binary is present. The long-running backend is always `thv serve --openapi --experimental-mcp ... --port=N`, so use `pgrep -f "thv serve"` to gate on that specifically.

### Secret provider returns 500

ToolHive's secret API needs DBus + gnome-keyring. The Dockerfile installs `dbus`, `dbus-x11`, `gnome-keyring`, `libsecret-1-0`, `libsecret-1-dev`, and the entrypoint starts `dbus-launch` and unlocks the keyring with `gnome-keyring-daemon --unlock --components=secrets,ssh,pkcs11`. The exact setup mirrors `.github/workflows/_e2e.yml` — if it breaks, cross-reference there.

---

## Rebuilding the container

Most script changes don't require a rebuild (scripts are bind-mounted). A rebuild is only needed when you change:

- `.devcontainer/Dockerfile` (apt packages)
- `.devcontainer/devcontainer.json` → `runArgs`, `features`, `mounts`

To force a rebuild:

```bash
npx --yes @devcontainers/cli up --workspace-folder . --remove-existing-container
```

---

## Codespaces specifics

- `forwardPorts: [6080]` exposes noVNC via the Codespaces tunnel (HTTPS).
- `portsAttributes."6080".onAutoForward: "openPreview"` makes the Simple Browser preview pane open automatically.
- `postStartCommand` runs `scripts/devcontainer-post-start.sh`, which (when `$CODESPACES` is set) nohup-launches the entrypoint in the background. So opening a Codespace gets you a running app with no terminal commands.
- The on-host port-picking logic (`NOVNC_HOST_PORT` env var, etc.) is a no-op here — `forwardPorts` is the only mechanism that matters for the user-facing URL.

---

## What this skill is NOT

- Not a guide for the **standard non-container dev workflow**. If you want `pnpm start` running directly on the host, follow the top-level `CLAUDE.md` instructions, not this skill.
- Not a guide for **packaging** or **e2e tests**. `pnpm make` / `pnpm e2e` have their own workflows.
- Not a general Docker / devcontainer tutorial. It only covers this project's specific setup.
