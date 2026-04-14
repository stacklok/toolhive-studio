import { describe, expect, it } from 'vitest'
import {
  CLIENT_FLATPAK_PATHS,
  flatpakFilesystemEntries,
  parseThvClients,
} from '../flatpak-client-paths'

// Representative sample matching the format of `thv client register --help`.
// Includes a version banner to verify the parser ignores it.
const SAMPLE_HELP = `A new version of ToolHive is available: v0.10.2
Currently running: v0.9.4
Register a client for MCP server configuration.

Valid clients:
  - amp-cli: Sourcegraph Amp CLI
  - amp-cursor: Cursor Sourcegraph Amp extension
  - amp-vscode: VS Code Sourcegraph Amp extension
  - amp-vscode-insider: VS Code Insiders Sourcegraph Amp extension
  - amp-windsurf: Windsurf Sourcegraph Amp extension
  - antigravity: Google Antigravity IDE
  - claude-code: Claude Code CLI
  - cline: VS Code Cline extension
  - codex: OpenAI Codex CLI
  - continue: Continue.dev IDE plugins
  - cursor: Cursor editor
  - factory: Factory.ai Droid
  - gemini-cli: Google Gemini CLI
  - goose: Goose AI agent
  - kimi-cli: Kimi Code CLI
  - kiro: Kiro AI IDE
  - lm-studio: LM Studio application
  - mistral-vibe: Mistral Vibe IDE
  - opencode: OpenCode editor
  - roo-code: VS Code Roo Code extension
  - trae: Trae IDE
  - vscode: Visual Studio Code
  - vscode-insider: Visual Studio Code Insiders
  - vscode-server: Microsoft's VS Code Server (remote development)
  - windsurf: Windsurf IDE
  - windsurf-jetbrains: Windsurf plugin for JetBrains IDEs
  - zed: Zed editor

Usage:
  thv client register [client] [flags]

Flags:
      --group strings   Only register workloads from specified groups (default [default])
  -h, --help            help for register

Global Flags:
      --debug   Enable debug mode
`

describe('parseThvClients', () => {
  it('parses at least 10 clients from sample output', () => {
    expect(parseThvClients(SAMPLE_HELP).length).toBeGreaterThanOrEqual(10)
  })

  it('ignores version banner lines', () => {
    const clients = parseThvClients(SAMPLE_HELP)
    expect(clients).not.toContain('v0.10.2')
    expect(clients).not.toContain('v0.9.4')
  })

  it('includes stable well-known clients', () => {
    const clients = parseThvClients(SAMPLE_HELP)
    for (const stable of [
      'claude-code',
      'vscode',
      'cursor',
      'zed',
      'goose',
      'continue',
    ]) {
      expect(clients).toContain(stable)
    }
  })

  it('returns empty array for empty input', () => {
    expect(parseThvClients('')).toEqual([])
  })

  it('ignores flags section lines that contain colons', () => {
    const clients = parseThvClients(SAMPLE_HELP)
    // "--group strings" and "--debug" should not be parsed as clients
    expect(clients).not.toContain('--group')
    expect(clients).not.toContain('--debug')
  })
})

describe('CLIENT_FLATPAK_PATHS', () => {
  it('has a non-empty path list for every client in sample output', () => {
    const clients = parseThvClients(SAMPLE_HELP)
    for (const client of clients) {
      expect(
        CLIENT_FLATPAK_PATHS,
        `Missing mapping for client "${client}"`
      ).toHaveProperty(client)
      expect(
        CLIENT_FLATPAK_PATHS[client]?.length,
        `Empty path list for client "${client}"`
      ).toBeGreaterThan(0)
    }
  })
})

describe('flatpakFilesystemEntries', () => {
  it('throws for an unmapped client', () => {
    expect(() => flatpakFilesystemEntries(['not-a-real-client'])).toThrow(
      /No Flatpak filesystem path mapping/
    )
  })

  it('deduplicates paths shared between clients', () => {
    // vscode, roo-code, cline all map to ~/.config/Code
    const entries = flatpakFilesystemEntries(['vscode', 'roo-code', 'cline'])
    const codePaths = entries.filter((e) => e.includes('/.config/Code'))
    expect(codePaths).toHaveLength(1)
  })

  it('returns a sorted list', () => {
    const entries = flatpakFilesystemEntries(['zed', 'cursor', 'claude-code'])
    expect(entries).toEqual([...entries].sort())
  })

  it('covers all clients in the sample output without throwing', () => {
    const clients = parseThvClients(SAMPLE_HELP)
    expect(() => flatpakFilesystemEntries(clients)).not.toThrow()
  })
})
