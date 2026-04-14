/**
 * Flatpak filesystem permissions for ToolHive client integrations.
 *
 * Maps each client ID (as reported by `thv client register --help`) to the
 * list of filesystem paths that ToolHive needs read/write access to on Linux.
 *
 * This mapping is validated at build time by MakerFlatpakBuilder, which runs
 * `thv client register --help` and checks every reported client has an entry here.
 * If a new client is added to `thv` without a corresponding entry, the build fails.
 */
export const CLIENT_FLATPAK_PATHS: Record<string, string[]> = {
  'amp-cli': ['~/.config/amp'],
  'amp-cursor': ['~/.config/Cursor'],
  'amp-vscode': ['~/.config/Code'],
  'amp-vscode-insider': ['~/.config/Code - Insiders'],
  'amp-windsurf': ['~/.config/Windsurf'],
  antigravity: ['~/.gemini'],
  'claude-code': ['~/.claude.json', '~/.claude'],
  cline: ['~/.config/Code'],
  codex: ['~/.codex', '~/.agents'],
  continue: ['~/.continue'],
  cursor: ['~/.cursor'],
  factory: ['~/.factory'],
  'gemini-cli': ['~/.gemini'],
  goose: ['~/.config/goose'],
  'kimi-cli': ['~/.kimi'],
  kiro: ['~/.kiro'],
  'lm-studio': ['~/.lmstudio'],
  'mistral-vibe': ['~/.vibe'],
  opencode: ['~/.config/opencode'],
  'roo-code': ['~/.config/Code'],
  trae: ['~/.config/Trae'],
  vscode: ['~/.config/Code'],
  'vscode-insider': ['~/.config/Code - Insiders'],
  'vscode-server': ['~/.vscode-server'],
  windsurf: ['~/.codeium/windsurf'],
  'windsurf-jetbrains': ['~/.codeium'],
  zed: ['~/.config/zed'],
}

/**
 * Parses the output of `thv client register --help` and returns the list of
 * supported client IDs.
 *
 * The output may include version banner lines (e.g. "A new version of ToolHive
 * is available") before the actual content, so we anchor on the `  - name:`
 * pattern rather than relying on position.
 */
export function parseThvClients(helpOutput: string): string[] {
  const clients: string[] = []
  for (const line of helpOutput.split('\n')) {
    const match = /^\s+-\s+(\S+):/.exec(line)
    if (match?.[1]) {
      clients.push(match[1])
    }
  }
  return clients
}

/**
 * Returns the deduplicated, sorted list of `--filesystem=` entries covering
 * all clients in `clientIds`. Throws if any client ID has no mapping entry.
 */
export function flatpakFilesystemEntries(clientIds: string[]): string[] {
  const paths = new Set<string>()
  for (const id of clientIds) {
    const entries = CLIENT_FLATPAK_PATHS[id]
    if (!entries) {
      throw new Error(
        `No Flatpak filesystem path mapping for client "${id}". ` +
          `Add an entry to CLIENT_FLATPAK_PATHS in utils/flatpak-client-paths.ts`
      )
    }
    for (const p of entries) {
      paths.add(`--filesystem=${p}`)
    }
  }
  return Array.from(paths).sort()
}
