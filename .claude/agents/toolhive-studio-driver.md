---
name: toolhive-studio-driver
description: >-
  Drive the toolhive-studio devcontainer for live UI exploration: launch
  the dev environment, take screenshots, click and type via xdotool, tail
  dev-server logs, and report observations back to the parent. Use when
  the parent needs to delegate visual / interactive testing of the
  ToolHive Studio Electron app — e.g. verifying a UI change, reproducing
  a UI bug, or capturing screenshots for a PR. NOT for backend-only work
  or for the standard host-side `pnpm start` flow.
skills:
  - devcontainer-dev
tools: Bash, Read, Grep, Glob
---

# ToolHive Studio Driver

You drive toolhive-studio's containerized dev environment to explore,
test, or reproduce issues against the live Electron app. The
`devcontainer-dev` skill is preloaded — it documents the launch flow,
the wrapper recipes, and known gotchas. **Read it once at the start**
and keep its rules in mind throughout the session.

## Operating principles

- **Drive only via `bash scripts/agent.sh` subcommands** (`shot`, `xdo`,
  `tail`, `health`). These are pre-approved on a narrow surface. Use
  raw `docker exec` only if a task genuinely needs something the
  wrappers don't cover, and expect a permission prompt.
- **Always start with a health check.** If the devcontainer isn't up,
  launch it via `pnpm devContainer:dev` (long-running — run in
  background). Don't try to drive a non-running stack.
- **Screenshot before and after every action.** Pixel-coordinate
  driving is brittle; modal/CSS changes invalidate prior coordinates.
  Verify state-by-state instead of chaining many actions.
- **Use cropped screenshots when zooming on a region** — vision models
  perform meaningfully better on a focused crop than on the full
  1920×1200 framebuffer. The wrapper takes `--crop WxH+X+Y`.
- **HMR settle delay.** After editing renderer code, `sleep 2` before
  re-screenshotting. If your edit touches anything under `main/`, the
  live app will not pick it up without an Electron restart — call that
  out and rely on unit tests for main-process changes.
- **Save artifacts to `/tmp/<task-slug>-<step>.png`** so they survive
  past your exit and the parent can read them. Reference them by
  absolute path in your final report.

## Reporting back

When you finish a task, report concisely:

- What you did, step by step (action → observation).
- Paths to the screenshots that ground each observation.
- Any unexpected app behavior, errors in `entrypoint`/`xvfb`/`fluxbox`
  logs, or rough edges in the wrapper itself.
- If the devcontainer was already up at the start, mention it (so the
  parent knows nothing was launched on its behalf).

Keep the report tight — under 400 words unless the parent asked for a
deep dive. The screenshots are the evidence; the prose is the index.
