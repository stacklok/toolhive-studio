import { z } from 'zod'
import { tool, type ToolSet } from 'ai'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import log from '../../../../logger'
import { createClient, type Client } from '@common/api/generated/client'
import { getApiV1BetaSkills } from '@common/api/generated/sdk.gen'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'
import { getToolhivePort } from '../../../../toolhive-manager'
import { getHeaders } from '../../../../headers'

const READ_FILE_BYTE_CAP = 256 * 1024
const TREE_ENTRY_CAP = 1000
const SKILL_MD_FILENAMES = ['SKILL.md', 'Skill.md', 'skill.md']

/**
 * Mapping from ToolHive client identifier (returned in
 * `InstalledSkill.clients`) to the home subdirectory ToolHive materializes
 * skill files into. Unknown clients fall back to `.<clientId>`.
 */
const HOME_SUBDIR_BY_CLIENT: Record<string, string> = {
  'claude-code': '.claude',
  cursor: '.cursor',
  cline: '.cline',
  'roo-code': '.roo',
  codex: '.codex',
  continue: '.continue',
  'gemini-cli': '.gemini',
  kiro: '.kiro',
  'amp-cli': '.amp',
  'amp-vscode': '.amp',
  'amp-cursor': '.amp',
  'amp-vscode-insider': '.amp',
  'amp-windsurf': '.amp',
}

interface SkillSummary {
  name: string
  description: string
  reference: string
  version?: string
  clients: string[]
}

interface LoadedSkill {
  name: string
  reference: string
  version?: string
  rootDir: string
  client: string
  body: string
  files: { path: string; size: number }[]
}

export interface SkillTesterAgentToolsHandle {
  tools: ToolSet
  cleanup: () => Promise<void>
  instructionsSuffix: string
}

export interface CreateSkillTesterToolsDeps {
  buildClient?: () => Client | null
  /**
   * Override the home directory used to resolve installed skills on disk.
   * Primarily for tests; defaults to `os.homedir()`.
   */
  homeDir?: string
}

function defaultBuildClient(): Client | null {
  const port = getToolhivePort()
  if (!port) return null
  return createClient({
    baseUrl: `http://localhost:${port}`,
    headers: getHeaders(),
  })
}

function summariseInstalledSkill(skill: InstalledSkill): SkillSummary | null {
  const name = skill.metadata?.name?.trim()
  const reference = skill.reference?.trim()
  if (!name || !reference) return null
  return {
    name,
    description: skill.metadata?.description?.trim() ?? '',
    reference,
    clients: (skill.clients ?? []).filter(
      (c): c is string => typeof c === 'string' && c.length > 0
    ),
    ...(skill.metadata?.version ? { version: skill.metadata.version } : {}),
  }
}

async function fetchUserScopeSkills(
  client: Client
): Promise<{ skills: SkillSummary[]; error?: string }> {
  try {
    const { data, error } = await getApiV1BetaSkills({
      client,
      query: { scope: 'user' },
    })
    if (error) {
      const message = typeof error === 'string' ? error : JSON.stringify(error)
      return { skills: [], error: message }
    }
    const skills = (data?.skills ?? [])
      .map(summariseInstalledSkill)
      .filter((s): s is SkillSummary => s !== null)
    return { skills }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { skills: [], error: message }
  }
}

function renderInstructionsSuffix(
  skills: SkillSummary[],
  loadFailureReason?: string
): string {
  const header = '## Available installed skills (scope=user)'
  const usageHint =
    'Use `load_skill` with the skill `name` to read its on-disk install (SKILL.md plus any bundled files). Then use `read_skill_file` / `list_skill_tree` to inspect referenced resources. Call `list_skills` to refresh after installs/uninstalls.'

  if (skills.length === 0) {
    const reason = loadFailureReason
      ? `Could not load installed skills: ${loadFailureReason}.`
      : 'No user-scoped skills are currently installed.'
    return `${header}\n\n${reason} Once skills are installed, ask the user to run \`list_skills\` so you can pick one to test.`
  }

  const lines = skills.map(
    (s) =>
      `- \`${s.name}\`${s.version ? ` (${s.version})` : ''}: ${
        s.description || '(no description)'
      }`
  )

  return `${header}\n\n${usageHint}\n\n${lines.join('\n')}`
}

function homeSubdirForClient(clientId: string): string {
  return HOME_SUBDIR_BY_CLIENT[clientId] ?? `.${clientId}`
}

interface ResolvedSkillDir {
  dir: string
  client: string
  tried: string[]
}

async function resolveSkillDir(
  skillName: string,
  clients: readonly string[],
  homeDir: string
): Promise<ResolvedSkillDir | null> {
  const tried: string[] = []
  for (const c of clients) {
    const sub = homeSubdirForClient(c)
    const candidate = path.join(homeDir, sub, 'skills', skillName)
    tried.push(candidate)
    try {
      const s = await fs.stat(candidate)
      if (s.isDirectory()) return { dir: candidate, client: c, tried }
    } catch {
      // not installed for this client, keep trying the next one
    }
  }
  return null
}

function isPathInside(rootDir: string, candidate: string): boolean {
  const rel = path.relative(rootDir, candidate)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

async function findSkillMdInDir(rootDir: string): Promise<string | null> {
  for (const candidate of SKILL_MD_FILENAMES) {
    const abs = path.join(rootDir, candidate)
    try {
      const stat = await fs.stat(abs)
      if (stat.isFile()) return abs
    } catch {
      // try next variant
    }
  }
  return null
}

async function readSkillMd(rootDir: string): Promise<string> {
  const abs = await findSkillMdInDir(rootDir)
  if (!abs) {
    throw new Error(
      `No SKILL.md found in ${rootDir} (looked for ${SKILL_MD_FILENAMES.join(', ')})`
    )
  }
  return await fs.readFile(abs, 'utf8')
}

async function walkTree(
  rootDir: string,
  maxEntries: number
): Promise<{ entries: { path: string; size: number }[]; truncated: boolean }> {
  const entries: { path: string; size: number }[] = []
  let truncated = false

  async function visit(absDir: string): Promise<void> {
    if (entries.length >= maxEntries) {
      truncated = true
      return
    }
    let dirents
    try {
      dirents = await fs.readdir(absDir, { withFileTypes: true })
    } catch {
      return
    }
    for (const dirent of dirents) {
      if (entries.length >= maxEntries) {
        truncated = true
        return
      }
      const abs = path.join(absDir, dirent.name)
      const rel = path.relative(rootDir, abs)
      if (dirent.isDirectory()) {
        await visit(abs)
      } else if (dirent.isFile()) {
        try {
          const stat = await fs.stat(abs)
          entries.push({ path: rel, size: stat.size })
        } catch {
          // skip unreadable
        }
      }
    }
  }

  await visit(rootDir)
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return { entries, truncated }
}

export function createSkillTesterAgentTools(
  deps: CreateSkillTesterToolsDeps = {}
): Promise<SkillTesterAgentToolsHandle> {
  const buildClient = deps.buildClient ?? defaultBuildClient
  const homeDir = deps.homeDir ?? os.homedir()
  const client = buildClient()

  let cached: SkillSummary[] = []
  const loaded = new Map<string, LoadedSkill>()

  async function refreshCache(): Promise<{
    skills: SkillSummary[]
    error?: string
  }> {
    if (!client) {
      return {
        skills: [],
        error:
          'ToolHive is not running locally. Ask the user to start it and try again.',
      }
    }
    const result = await fetchUserScopeSkills(client)
    if (!result.error) cached = result.skills
    return result
  }

  async function resolveSummary(name: string): Promise<SkillSummary | null> {
    const trimmed = name.trim()
    const fromCache = cached.find((s) => s.name === trimmed)
    if (fromCache) return fromCache
    const refreshed = await refreshCache()
    return refreshed.skills.find((s) => s.name === trimmed) ?? null
  }

  return refreshCache().then(({ skills, error }) => {
    if (error) {
      log.warn(
        '[AGENTS:skill-tester] Failed to load installed skills at startup:',
        error
      )
    } else {
      log.info(
        `[AGENTS:skill-tester] Discovered ${skills.length} user-scope skill(s) at startup`
      )
    }

    const tools: ToolSet = {
      list_skills: tool({
        description:
          'Re-fetches the list of user-scoped skills installed via ToolHive. Returns `{ skills: [{ name, description, reference, version, clients }] }`. Call this if the auto-injected list is empty or after the user installs/uninstalls a skill.',
        inputSchema: z.object({}),
        execute: async () => {
          const { skills: fresh, error: err } = await refreshCache()
          if (err) {
            log.warn('[AGENTS:skill-tester] list_skills failed:', err)
            return { error: `Failed to list installed skills: ${err}` }
          }
          log.info(
            `[AGENTS:skill-tester] list_skills returned ${fresh.length} skill(s)`
          )
          return { skills: fresh }
        },
      }),

      load_skill: tool({
        description:
          'Resolves the on-disk install of a user-scoped skill (under `~/.<client>/skills/<name>/`), reads `SKILL.md`, and returns `{ name, version, client, dir, body, files }`. `body` is the raw SKILL.md, `files` is a recursive listing of bundled resources (`{ path, size }`). The first client in `InstalledSkill.clients` whose directory exists wins. Call this exactly once per skill before any read_skill_file/list_skill_tree call.',
        inputSchema: z.object({
          name: z
            .string()
            .min(1)
            .describe(
              'The bare skill name (matches `metadata.name` in the InstalledSkill record), e.g. "my-skill". No tag, no registry prefix.'
            ),
        }),
        execute: async ({ name }) => {
          const trimmed = name.trim()
          if (!trimmed) return { error: 'Skill name cannot be empty.' }

          const existing = loaded.get(trimmed)
          if (existing) {
            return {
              name: existing.name,
              ...(existing.version ? { version: existing.version } : {}),
              client: existing.client,
              dir: existing.rootDir,
              body: existing.body,
              files: existing.files,
              cached: true,
            }
          }

          const summary = await resolveSummary(trimmed)
          if (!summary) {
            return {
              error: `No installed user-scope skill found with name "${trimmed}". Call list_skills to see what is available.`,
            }
          }

          if (summary.clients.length === 0) {
            return {
              error: `Skill "${trimmed}" has no associated clients on the InstalledSkill record. Re-install it via the Skills page so ToolHive materializes it for at least one client.`,
            }
          }

          let resolved: ResolvedSkillDir | null
          try {
            resolved = await resolveSkillDir(trimmed, summary.clients, homeDir)
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            log.error(
              `[AGENTS:skill-tester] resolveSkillDir threw for "${trimmed}":`,
              err
            )
            return {
              error: `Failed to resolve install dir for "${trimmed}": ${message}`,
            }
          }

          if (!resolved) {
            return {
              error: `Could not find an on-disk install for skill "${trimmed}". Looked under: ${summary.clients
                .map((c) =>
                  path.join(homeDir, homeSubdirForClient(c), 'skills', trimmed)
                )
                .join(
                  ', '
                )}. Re-install the skill so ToolHive materializes its files.`,
            }
          }

          try {
            const body = await readSkillMd(resolved.dir)
            const { entries: files } = await walkTree(
              resolved.dir,
              TREE_ENTRY_CAP
            )
            const entry: LoadedSkill = {
              name: trimmed,
              reference: summary.reference,
              ...(summary.version ? { version: summary.version } : {}),
              rootDir: resolved.dir,
              client: resolved.client,
              body,
              files,
            }
            loaded.set(trimmed, entry)
            log.info(
              `[AGENTS:skill-tester] load_skill ready for "${trimmed}" (${files.length} file(s), client=${resolved.client}, dir=${resolved.dir})`
            )
            return {
              name: trimmed,
              ...(summary.version ? { version: summary.version } : {}),
              client: resolved.client,
              dir: resolved.dir,
              body,
              files,
              cached: false,
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            log.error(
              `[AGENTS:skill-tester] load_skill failed for "${trimmed}":`,
              err
            )
            return { error: `Failed to load skill "${trimmed}": ${message}` }
          }
        },
      }),

      read_skill_file: tool({
        description:
          'Reads a UTF-8 text file bundled with a loaded skill. `path` is RELATIVE to the install root (the directory containing SKILL.md). No `..`, no absolute paths. Files larger than 256 KB are returned with `truncated: true`. Returns `{ content, truncated, size }`.',
        inputSchema: z.object({
          name: z
            .string()
            .min(1)
            .describe('The skill name previously passed to load_skill.'),
          path: z
            .string()
            .min(1)
            .describe(
              'Relative path inside the skill install dir, e.g. "templates/page.html".'
            ),
        }),
        execute: async ({ name, path: relPath }) => {
          const entry = loaded.get(name.trim())
          if (!entry) {
            return {
              error: `Skill "${name}" is not loaded. Call load_skill first.`,
            }
          }
          if (path.isAbsolute(relPath) || relPath.includes('..')) {
            return {
              error: `Invalid path "${relPath}". Must be relative and must not contain "..".`,
            }
          }
          const abs = path.resolve(entry.rootDir, relPath)
          if (!isPathInside(entry.rootDir, abs)) {
            return {
              error: `Path "${relPath}" resolves outside the skill install root.`,
            }
          }
          try {
            const stat = await fs.stat(abs)
            if (!stat.isFile()) {
              return { error: `"${relPath}" is not a regular file.` }
            }
            const handle = await fs.open(abs, 'r')
            try {
              const buf = Buffer.alloc(Math.min(stat.size, READ_FILE_BYTE_CAP))
              await handle.read(buf, 0, buf.length, 0)
              const truncated = stat.size > READ_FILE_BYTE_CAP
              return {
                content: buf.toString('utf8'),
                truncated,
                size: stat.size,
              }
            } finally {
              await handle.close()
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            return { error: `Failed to read "${relPath}": ${message}` }
          }
        },
      }),

      list_skill_tree: tool({
        description:
          "Recursively lists files under a loaded skill's on-disk install. Returns `{ entries: [{ path, size }], truncated }`. Capped at 1000 entries by default.",
        inputSchema: z.object({
          name: z
            .string()
            .min(1)
            .describe('The skill name previously passed to load_skill.'),
          maxEntries: z
            .number()
            .int()
            .positive()
            .max(TREE_ENTRY_CAP)
            .optional()
            .describe(
              `Optional cap on the number of returned entries (default and max ${TREE_ENTRY_CAP}).`
            ),
        }),
        execute: async ({ name, maxEntries }) => {
          const entry = loaded.get(name.trim())
          if (!entry) {
            return {
              error: `Skill "${name}" is not loaded. Call load_skill first.`,
            }
          }
          try {
            const { entries, truncated } = await walkTree(
              entry.rootDir,
              maxEntries ?? TREE_ENTRY_CAP
            )
            return { entries, truncated }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            return { error: `Failed to walk skill tree: ${message}` }
          }
        },
      }),
    }

    return {
      tools,
      cleanup: async () => {
        loaded.clear()
      },
      instructionsSuffix: renderInstructionsSuffix(skills, error),
    }
  })
}
