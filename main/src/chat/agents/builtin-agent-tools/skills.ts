import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { app } from 'electron'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { tool, type ToolSet } from 'ai'
import log from '../../../logger'
import { createClient, type Client } from '@common/api/generated/client'
import {
  getApiV1BetaSkills,
  getApiV1BetaSkillsBuilds,
  postApiV1BetaSkillsBuild,
} from '@common/api/generated/sdk.gen'
import type {
  GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill,
  GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild,
} from '@common/api/generated/types.gen'
import { getToolhivePort } from '../../../toolhive-manager'
import { getHeaders } from '../../../headers'
import {
  getEnabledSkills as defaultGetEnabledSkills,
  pruneEnabledSkillsTo as defaultPruneEnabledSkillsTo,
} from '../../settings-storage'

const WRITE_SKILL_FILES_TOOL = 'write_skill_files'
const BUILD_SKILL_TOOL = 'build_skill'
const LIST_SKILLS_TOOL = 'list_skills'
const LOAD_SKILL_TOOL = 'load_skill'
const READ_SKILL_FILE_TOOL = 'read_skill_file'
const LIST_SKILL_TREE_TOOL = 'list_skill_tree'

const READ_FILE_BYTE_CAP = 256 * 1024
const TREE_ENTRY_CAP = 1000
const SKILL_MD_FILENAME = 'SKILL.md'

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

async function createSkillWorkdir(): Promise<string> {
  const baseDir = path.join(app.getPath('temp'), 'thv-skills')
  const workdir = path.join(baseDir, `thv-skill-${nanoid(10)}`)
  await fs.mkdir(workdir, { recursive: true })
  return workdir
}

function isPathInside(child: string, parent: string): boolean {
  const rel = path.relative(parent, child)
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel)
}

async function writeSkillFiles(
  workdir: string,
  files: { path: string; content: string }[]
): Promise<string[]> {
  const written: string[] = []
  for (const file of files) {
    if (!file.path || file.path.trim() === '') {
      throw new Error('File path cannot be empty')
    }
    if (path.isAbsolute(file.path)) {
      throw new Error(
        `File path must be relative to the skill workdir: ${file.path}`
      )
    }
    const absolute = path.resolve(workdir, file.path)
    if (!isPathInside(absolute, workdir)) {
      throw new Error(`File path escapes the skill workdir: ${file.path}`)
    }
    await fs.mkdir(path.dirname(absolute), { recursive: true })
    await fs.writeFile(absolute, file.content, 'utf8')
    written.push(path.relative(workdir, absolute))
  }
  return written
}

interface SkillVariant {
  scope: 'user' | 'project'
  projectRoot?: string
  clients: string[]
}

interface SkillSummary {
  name: string
  description: string
  reference: string
  version?: string
  /**
   * Installation sites for this skill name. A skill may be installed in the
   * user home and/or in one or more project roots; we dedup by name and keep
   * every variant so the on-disk resolver can try them in order.
   */
  variants: SkillVariant[]
}

interface LoadedSkill {
  name: string
  reference: string
  version?: string
  rootDir: string
  client: string
  scope: 'user' | 'project'
  projectRoot?: string
  body: string
  files: { path: string; size: number }[]
  /**
   * `true` when `walkTree` hit `TREE_ENTRY_CAP` while listing bundled files —
   * the `files` array is incomplete and audit verdicts that depend on
   * cross-checking referenced paths must treat unknown entries as "not yet
   * verified" rather than "missing".
   */
  filesTruncated: boolean
}

interface RawInstalledSkill {
  name: string
  description: string
  reference: string
  version?: string
  scope: 'user' | 'project'
  projectRoot?: string
  clients: string[]
}

function coerceScope(value: unknown): 'user' | 'project' {
  return value === 'project' ? 'project' : 'user'
}

function summariseInstalledSkill(
  skill: InstalledSkill
): RawInstalledSkill | null {
  const name = skill.metadata?.name?.trim()
  const reference = skill.reference?.trim()
  if (!name || !reference) return null
  const scope = coerceScope(skill.scope)
  const projectRoot =
    scope === 'project' && typeof skill.project_root === 'string'
      ? skill.project_root.trim()
      : undefined
  return {
    name,
    description: skill.metadata?.description?.trim() ?? '',
    reference,
    ...(skill.metadata?.version ? { version: skill.metadata.version } : {}),
    scope,
    ...(projectRoot ? { projectRoot } : {}),
    clients: (skill.clients ?? []).filter(
      (c): c is string => typeof c === 'string' && c.length > 0
    ),
  }
}

/**
 * Groups raw installed skills by `name` so a skill installed in both the user
 * home and one or more project roots collapses into a single `SkillSummary`
 * with multiple variants. The canonical `description`/`version`/`reference`
 * come from the first user variant if present, else the first project variant.
 * Variants are sorted user-first so disk resolution prefers the home install.
 */
function dedupByName(raw: RawInstalledSkill[]): SkillSummary[] {
  const groups = new Map<string, RawInstalledSkill[]>()
  for (const r of raw) {
    const bucket = groups.get(r.name) ?? []
    bucket.push(r)
    groups.set(r.name, bucket)
  }

  const summaries: SkillSummary[] = []
  for (const [name, entries] of groups) {
    const sorted = [...entries].sort((a, b) => {
      if (a.scope === b.scope) return 0
      return a.scope === 'user' ? -1 : 1
    })
    const canonical =
      sorted.find((e) => e.scope === 'user' && e.description) ??
      sorted.find((e) => e.description) ??
      sorted[0]!
    const variants: SkillVariant[] = sorted.map((e) => ({
      scope: e.scope,
      ...(e.projectRoot ? { projectRoot: e.projectRoot } : {}),
      clients: e.clients,
    }))
    summaries.push({
      name,
      description: canonical.description,
      reference: canonical.reference,
      ...(canonical.version ? { version: canonical.version } : {}),
      variants,
    })
  }
  return summaries
}

async function fetchInstalledSkills(
  client: Client
): Promise<{ skills: SkillSummary[]; error?: string }> {
  try {
    const { data, error } = await getApiV1BetaSkills({ client })
    if (error) {
      const message = typeof error === 'string' ? error : JSON.stringify(error)
      return { skills: [], error: message }
    }
    const raw = (data?.skills ?? [])
      .map(summariseInstalledSkill)
      .filter((s): s is RawInstalledSkill => s !== null)
    return { skills: dedupByName(raw) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { skills: [], error: message }
  }
}

function homeSubdirForClient(clientId: string): string {
  return HOME_SUBDIR_BY_CLIENT[clientId] ?? `.${clientId}`
}

interface ResolvedSkillDir {
  dir: string
  client: string
  scope: 'user' | 'project'
  projectRoot?: string
  tried: string[]
}

async function resolveSkillDir(
  summary: SkillSummary,
  homeDir: string
): Promise<ResolvedSkillDir | null> {
  const tried: string[] = []
  for (const variant of summary.variants) {
    const base = variant.scope === 'user' ? homeDir : variant.projectRoot
    if (!base) continue
    for (const c of variant.clients) {
      const sub = homeSubdirForClient(c)
      const candidate = path.join(base, sub, 'skills', summary.name)
      tried.push(candidate)
      try {
        const s = await fs.stat(candidate)
        if (s.isDirectory()) {
          return {
            dir: candidate,
            client: c,
            scope: variant.scope,
            ...(variant.projectRoot
              ? { projectRoot: variant.projectRoot }
              : {}),
            tried,
          }
        }
      } catch {
        // not installed here, keep trying the next candidate
      }
    }
  }
  return null
}

async function readSkillMd(rootDir: string): Promise<string> {
  // Strict filename match: a skill is required to ship `SKILL.md` exactly.
  // Lower-case or title-case variants must fail audit, not silently pass.
  const abs = path.join(rootDir, SKILL_MD_FILENAME)
  try {
    const stat = await fs.stat(abs)
    if (!stat.isFile()) {
      throw new Error(
        `${SKILL_MD_FILENAME} in ${rootDir} is not a regular file`
      )
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `No ${SKILL_MD_FILENAME} found in ${rootDir} (filename is case-sensitive — Skill.md / skill.md are not accepted)`
      )
    }
    throw err
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

interface InstructionsContext {
  installedCount: number
  loadFailureReason?: string
}

function describeVariants(variants: readonly SkillVariant[]): string {
  if (variants.length === 0) return ''
  const parts = variants.map((v) => {
    if (v.scope === 'user') return 'user'
    if (!v.projectRoot) return 'project'
    const leaf =
      v.projectRoot.split(/[\\/]/).filter(Boolean).at(-1) ?? v.projectRoot
    return `project ${leaf}`
  })
  return ` [installed in: ${parts.join(', ')}]`
}

function renderInstructionsSuffix(
  enabledSkills: SkillSummary[],
  ctx: InstructionsContext
): string {
  const header = '## Available installed skills'
  const usageHint =
    'Use `load_skill` with the skill `name` to read its on-disk install (SKILL.md plus any bundled files). Each skill may be installed in the user home and/or in one or more project roots; resolution prefers the user install and falls back to projects in backend order. Use `read_skill_file` / `list_skill_tree` to inspect referenced resources. Call `list_skills` to refresh after the user toggles skills.'

  if (enabledSkills.length === 0) {
    if (ctx.loadFailureReason) {
      return `${header}\n\nCould not load installed skills: ${ctx.loadFailureReason}. Ask the user to retry once ToolHive is reachable.`
    }
    if (ctx.installedCount === 0) {
      return `${header}\n\nNo skills are currently installed. Ask the user to install one from the Skills page, then run \`list_skills\`.`
    }
    return `${header}\n\nNo skills are enabled for this chat. Tell the user to pick one from the Skills dropdown in the toolbar, then call \`list_skills\`.`
  }

  const lines = enabledSkills.map(
    (s) =>
      `- \`${s.name}\`${s.version ? ` (${s.version})` : ''}: ${
        s.description || '(no description)'
      }${describeVariants(s.variants)}`
  )

  return `${header}\n\n${usageHint}\n\n${lines.join('\n')}`
}

function defaultBuildClient(): Client | null {
  const port = getToolhivePort()
  if (!port) return null
  return createClient({
    baseUrl: `http://localhost:${port}`,
    headers: getHeaders(),
  })
}

export interface SkillsAgentToolsHandle {
  tools: ToolSet
  cleanup: () => Promise<void>
  instructionsSuffix: string
}

interface CreateSkillsToolsDeps {
  /**
   * Builds the ToolHive API client used for both authoring (build_skill) and
   * discovery (list_skills). Defaults to a client targeting the local daemon.
   */
  buildClient?: () => Client | null
  /**
   * Override the home directory used to resolve installed skills on disk.
   * Primarily for tests; defaults to `os.homedir()`.
   */
  homeDir?: string
  /**
   * Returns the global allow-list of skill names the user has enabled via the
   * toolbar. Re-read on every call so toggles made mid-conversation are
   * honoured without rebuilding the handle.
   */
  getEnabledSkills?: () => readonly string[]
  /**
   * Prunes any enabled-skill rows whose names are not in the given list.
   * Called opportunistically after a successful fetch so stale rows from
   * uninstalled skills eventually disappear.
   */
  pruneEnabledSkillsTo?: (installedNames: readonly string[]) => number
}

export async function createSkillsAgentTools(
  deps: CreateSkillsToolsDeps = {}
): Promise<SkillsAgentToolsHandle> {
  const buildClient = deps.buildClient ?? defaultBuildClient
  const homeDir = deps.homeDir ?? os.homedir()
  const readEnabledSkills = deps.getEnabledSkills ?? defaultGetEnabledSkills
  const pruneEnabledSkillsTo =
    deps.pruneEnabledSkillsTo ?? defaultPruneEnabledSkillsTo

  const workdirs = new Set<string>()
  let cached: SkillSummary[] = []
  const loaded = new Map<string, LoadedSkill>()

  const apiClient = buildClient()

  function filterByEnabled(skills: SkillSummary[]): SkillSummary[] {
    let enabled: readonly string[]
    try {
      enabled = readEnabledSkills()
    } catch (err) {
      log.error(
        '[AGENTS:skills] Failed to read enabled skills, returning empty list:',
        err
      )
      return []
    }
    if (!enabled || enabled.length === 0) return []
    const allow = new Set(enabled)
    return skills.filter((s) => allow.has(s.name))
  }

  function isSkillEnabled(name: string): boolean {
    try {
      return readEnabledSkills().includes(name)
    } catch (err) {
      log.error(
        '[AGENTS:skills] Failed to read enabled skills, treating as disabled:',
        err
      )
      return false
    }
  }

  async function refreshCache(): Promise<{
    skills: SkillSummary[]
    error?: string
  }> {
    if (!apiClient) {
      return {
        skills: [],
        error:
          'ToolHive is not running locally. Ask the user to start it and try again.',
      }
    }
    const result = await fetchInstalledSkills(apiClient)
    if (!result.error) {
      cached = result.skills
      // Purge stale enabled_skills rows for skills that are no longer
      // installed. We only skip pruning when the fetch itself failed
      // (`result.error` set), so a successful response listing zero installs
      // — e.g. user uninstalled their last skill — still wipes the allow-list.
      try {
        const pruned = pruneEnabledSkillsTo(result.skills.map((s) => s.name))
        if (pruned > 0) {
          log.info(
            `[AGENTS:skills] Pruned ${pruned} stale enabled-skill row(s) after refresh`
          )
        }
      } catch (err) {
        log.warn('[AGENTS:skills] Failed to prune stale enabled skills:', err)
      }
    }
    return result
  }

  async function resolveSummary(name: string): Promise<SkillSummary | null> {
    const trimmed = name.trim()
    const fromCache = cached.find((s) => s.name === trimmed)
    if (fromCache) return fromCache
    const refreshed = await refreshCache()
    return refreshed.skills.find((s) => s.name === trimmed) ?? null
  }

  const { skills: startupSkills, error: startupError } = await refreshCache()
  if (startupError) {
    log.warn(
      '[AGENTS:skills] Failed to load installed skills at startup:',
      startupError
    )
  } else {
    log.info(
      `[AGENTS:skills] Discovered ${startupSkills.length} installed skill(s) at startup (${filterByEnabled(startupSkills).length} enabled for chat)`
    )
  }

  const tools: ToolSet = {
    [WRITE_SKILL_FILES_TOOL]: tool({
      description:
        'Creates an isolated temporary working directory for a skill and writes the provided files into it. Returns the absolute path (`workdir`) of that directory. Paths must be RELATIVE to the workdir (no absolute paths, no `..` traversal). Call this ONCE per skill, then pass the returned `workdir` to `build_skill`.',
      inputSchema: z.object({
        files: z
          .array(
            z.object({
              path: z
                .string()
                .describe(
                  'Relative path inside the skill workdir, e.g. "skill.yaml" or "scripts/run.sh".'
                ),
              content: z.string().describe('UTF-8 file contents.'),
            })
          )
          .min(1)
          .describe('List of files to write into the skill workdir.'),
      }),
      execute: async ({ files }) => {
        try {
          const hasSkillMd = files.some(
            (f) => f.path.trim() === 'SKILL.md' && f.content.trim().length > 0
          )
          if (!hasSkillMd) {
            return {
              error:
                'Missing SKILL.md. Every skill MUST include a non-empty file at path "SKILL.md" (exact name, at the workdir root) with YAML frontmatter containing `name` and `description`, followed by the markdown instructions. Re-call write_skill_files with a SKILL.md entry included.',
            }
          }

          const workdir = await createSkillWorkdir()
          workdirs.add(workdir)
          const written = await writeSkillFiles(workdir, files)
          log.info(
            `[AGENTS:skills] Wrote ${written.length} file(s) to ${workdir}`
          )
          return {
            workdir,
            files: written,
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          log.error('[AGENTS:skills] write_skill_files failed:', error)
          return {
            error: `Failed to write skill files: ${message}`,
          }
        }
      },
    }),

    [BUILD_SKILL_TOOL]: tool({
      description:
        'Builds the skill that lives at `workdir` using the local ToolHive API. Pass the exact `workdir` returned by `write_skill_files`. On success returns an object with: `reference` (canonical artifact reference in `name:tag` form, derived from the SKILL.md frontmatter), `apiReference` (raw reference returned by the build endpoint), `tag` (local build tag for install / navigation), `workdir`, and `build` (full LocalBuild metadata: name, description, tag, version, digest).',
      inputSchema: z.object({
        workdir: z
          .string()
          .min(1)
          .describe(
            'Absolute path to the skill working directory (from write_skill_files).'
          ),
        tag: z
          .string()
          .optional()
          .describe('Optional OCI tag for the built artifact, e.g. "v1.0.0".'),
      }),
      execute: async ({ workdir, tag }) => {
        try {
          try {
            await fs.access(path.join(workdir, 'SKILL.md'))
          } catch {
            return {
              error: `No SKILL.md found at ${workdir}. A skill MUST contain a file named exactly "SKILL.md" at the workdir root. Call write_skill_files again with a SKILL.md entry.`,
            }
          }

          if (!apiClient) {
            return {
              error:
                'ToolHive is not running locally. Ask the user to start it and try again.',
            }
          }

          const { data, error } = await postApiV1BetaSkillsBuild({
            client: apiClient,
            body: {
              path: workdir,
              ...(tag ? { tag } : {}),
            },
          })

          if (error) {
            const message =
              typeof error === 'string' ? error : JSON.stringify(error)
            log.error('[AGENTS:skills] build_skill failed:', message)
            return { error: `Build failed: ${message}` }
          }

          const apiReference = data?.reference
          if (!apiReference) {
            return {
              error:
                'Build completed but no OCI reference was returned by the API.',
            }
          }

          log.info(`[AGENTS:skills] build_skill succeeded: ${apiReference}`)

          const matchLocalBuild = (builds: LocalBuild[]): LocalBuild | null =>
            builds.find((b) => b.tag === apiReference) ??
            builds.find(
              (b) =>
                b.tag &&
                (apiReference === b.tag ||
                  apiReference.endsWith(`:${b.tag}`) ||
                  apiReference.endsWith(`/${b.tag}`) ||
                  apiReference.endsWith(b.tag))
            ) ??
            (tag ? builds.find((b) => b.tag === tag) : undefined) ??
            null

          let build: LocalBuild | null = null
          for (const delay of [0, 250, 500, 1000]) {
            if (delay) await new Promise((r) => setTimeout(r, delay))
            try {
              const { data: list } = await getApiV1BetaSkillsBuilds({
                client: apiClient,
              })
              build = matchLocalBuild(list?.builds ?? [])
              if (build) break
            } catch (err) {
              log.warn(
                '[AGENTS:skills] Failed to enrich build_skill result with builds metadata:',
                err
              )
              break
            }
          }

          const effectiveBuild: LocalBuild = build ?? {
            tag: apiReference,
            ...(tag ? { version: tag } : {}),
          }

          const name = effectiveBuild.name
          const resolvedTag = effectiveBuild.tag ?? tag ?? apiReference
          const reference =
            name && resolvedTag
              ? resolvedTag.startsWith(`${name}:`) || resolvedTag.includes('/')
                ? resolvedTag
                : `${name}:${resolvedTag}`
              : (name ?? resolvedTag ?? apiReference)

          return {
            reference,
            apiReference,
            build: effectiveBuild,
            tag: resolvedTag,
            workdir,
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          log.error('[AGENTS:skills] build_skill threw:', error)
          return { error: `Build failed: ${message}` }
        }
      },
    }),

    [LIST_SKILLS_TOOL]: tool({
      description:
        "Re-fetches the list of skills installed via ToolHive **and enabled for this chat via the Skills picker in the toolbar**. Covers both user-scope (installed under `~/.<client>/skills/`) and project-scope (installed under `<project_root>/.<client>/skills/`) installs. Entries are deduplicated by `name`: if the same skill is installed in both the user home and one or more projects, it appears once with a `variants` array listing every installation site (`{ scope, projectRoot?, clients }`). Returns `{ skills: [{ name, description, reference, version, variants }] }`. The list is already filtered by the user's selection, so an empty list means the user has not enabled any skills yet.",
      inputSchema: z.object({}),
      execute: async () => {
        const { skills: fresh, error: err } = await refreshCache()
        if (err) {
          log.warn('[AGENTS:skills] list_skills failed:', err)
          return { error: `Failed to list installed skills: ${err}` }
        }
        const filtered = filterByEnabled(fresh)
        log.info(
          `[AGENTS:skills] list_skills returned ${filtered.length}/${fresh.length} skill(s) after enabled-filter`
        )
        return { skills: filtered }
      },
    }),

    [LOAD_SKILL_TOOL]: tool({
      description:
        'Resolves the on-disk install of an installed skill and reads `SKILL.md`. Returns `{ name, version, scope, projectRoot?, client, dir, body, files, filesTruncated }`. `scope` is `"user"` (install under `~/.<client>/skills/<name>/`) or `"project"` (install under `<projectRoot>/.<client>/skills/<name>/`); `projectRoot` is present only for project-scope hits. The required SKILL.md filename is case-sensitive — `Skill.md` / `skill.md` will surface as a load error. `filesTruncated` is `true` when the bundled-file listing hit the cap (1000 entries); when it is `true`, treat any path you cannot find in `files` as "not yet verified" rather than "missing", and call `list_skill_tree({ name, maxEntries })` on the relevant subtree before declaring an audit FAIL. When a skill is installed in multiple places, resolution prefers the user home, then falls back to each project in backend order, and for each site it tries every `InstalledSkill.clients` entry until a directory exists on disk. Call this exactly once per skill before any read_skill_file/list_skill_tree call. Only works on skills the user has enabled via the Skills picker.',
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
          if (!isSkillEnabled(trimmed)) {
            return {
              error: `Skill "${trimmed}" is not enabled for this chat. Ask the user to enable it from the Skills picker in the toolbar, then retry.`,
            }
          }
          return {
            name: existing.name,
            ...(existing.version ? { version: existing.version } : {}),
            scope: existing.scope,
            ...(existing.projectRoot
              ? { projectRoot: existing.projectRoot }
              : {}),
            client: existing.client,
            dir: existing.rootDir,
            body: existing.body,
            files: existing.files,
            filesTruncated: existing.filesTruncated,
            cached: true,
          }
        }

        const summary = await resolveSummary(trimmed)
        if (!summary) {
          return {
            error: `No installed skill found with name "${trimmed}". Call list_skills to see what is available.`,
          }
        }

        if (!isSkillEnabled(trimmed)) {
          return {
            error: `Skill "${trimmed}" is not enabled for this chat. Ask the user to enable it from the Skills picker in the toolbar, then retry.`,
          }
        }

        if (summary.variants.every((v) => v.clients.length === 0)) {
          return {
            error: `Skill "${trimmed}" has no associated clients on any InstalledSkill record. Re-install it via the Skills page so ToolHive materializes it for at least one client.`,
          }
        }

        let resolved: ResolvedSkillDir | null
        try {
          resolved = await resolveSkillDir(summary, homeDir)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          log.error(
            `[AGENTS:skills] resolveSkillDir threw for "${trimmed}":`,
            err
          )
          return {
            error: `Failed to resolve install dir for "${trimmed}": ${message}`,
          }
        }

        if (!resolved) {
          const candidates: string[] = []
          for (const variant of summary.variants) {
            const base =
              variant.scope === 'user' ? homeDir : variant.projectRoot
            if (!base) continue
            for (const c of variant.clients) {
              candidates.push(
                path.join(base, homeSubdirForClient(c), 'skills', trimmed)
              )
            }
          }
          return {
            error: `Could not find an on-disk install for skill "${trimmed}". Looked under: ${candidates.join(
              ', '
            )}. Re-install the skill so ToolHive materializes its files.`,
          }
        }

        try {
          const body = await readSkillMd(resolved.dir)
          const { entries: files, truncated: filesTruncated } = await walkTree(
            resolved.dir,
            TREE_ENTRY_CAP
          )
          const entry: LoadedSkill = {
            name: trimmed,
            reference: summary.reference,
            ...(summary.version ? { version: summary.version } : {}),
            rootDir: resolved.dir,
            client: resolved.client,
            scope: resolved.scope,
            ...(resolved.projectRoot
              ? { projectRoot: resolved.projectRoot }
              : {}),
            body,
            files,
            filesTruncated,
          }
          loaded.set(trimmed, entry)
          log.info(
            `[AGENTS:skills] load_skill ready for "${trimmed}" (${files.length} file(s)${filesTruncated ? ', TRUNCATED' : ''}, client=${resolved.client}, scope=${resolved.scope}${resolved.projectRoot ? `, projectRoot=${resolved.projectRoot}` : ''}, dir=${resolved.dir})`
          )
          return {
            name: trimmed,
            ...(summary.version ? { version: summary.version } : {}),
            scope: resolved.scope,
            ...(resolved.projectRoot
              ? { projectRoot: resolved.projectRoot }
              : {}),
            client: resolved.client,
            dir: resolved.dir,
            body,
            files,
            filesTruncated,
            cached: false,
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          log.error(`[AGENTS:skills] load_skill failed for "${trimmed}":`, err)
          return { error: `Failed to load skill "${trimmed}": ${message}` }
        }
      },
    }),

    [READ_SKILL_FILE_TOOL]: tool({
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
        if (!isPathInside(abs, entry.rootDir)) {
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

    [LIST_SKILL_TREE_TOOL]: tool({
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

  async function cleanup(): Promise<void> {
    for (const dir of workdirs) {
      try {
        await fs.rm(dir, { recursive: true, force: true })
      } catch (err) {
        log.warn(`[AGENTS:skills] Failed to clean up ${dir}:`, err)
      }
    }
    workdirs.clear()
    loaded.clear()
  }

  const enabledAtStart = filterByEnabled(startupSkills)

  return {
    tools,
    cleanup,
    instructionsSuffix: renderInstructionsSuffix(enabledAtStart, {
      installedCount: startupSkills.length,
      ...(startupError ? { loadFailureReason: startupError } : {}),
    }),
  }
}
