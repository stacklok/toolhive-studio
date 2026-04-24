import path from 'node:path'
import fs from 'node:fs/promises'
import { app } from 'electron'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { tool, type ToolSet } from 'ai'
import log from '../../../logger'
import { createClient } from '@common/api/generated/client'
import {
  getApiV1BetaSkillsBuilds,
  postApiV1BetaSkillsBuild,
} from '@common/api/generated/sdk.gen'
import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'
import { getToolhivePort } from '../../../toolhive-manager'
import { getHeaders } from '../../../headers'

const WRITE_SKILL_FILES_TOOL = 'write_skill_files'
const BUILD_SKILL_TOOL = 'build_skill'

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

export interface SkillsAgentToolsHandle {
  tools: ToolSet
  cleanup: () => Promise<void>
}

export function createSkillsAgentTools(): SkillsAgentToolsHandle {
  const workdirs = new Set<string>()

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

          const port = getToolhivePort()
          if (!port) {
            return {
              error:
                'ToolHive is not running locally. Ask the user to start it and try again.',
            }
          }

          const client = createClient({
            baseUrl: `http://localhost:${port}`,
            headers: getHeaders(),
          })

          const { data, error } = await postApiV1BetaSkillsBuild({
            client,
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

          // Listing endpoint can lag behind a brand-new artifact, retry briefly.
          let build: LocalBuild | null = null
          for (const delay of [0, 250, 500, 1000]) {
            if (delay) await new Promise((r) => setTimeout(r, delay))
            try {
              const { data: list } = await getApiV1BetaSkillsBuilds({ client })
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

          // Build API may return only the tag (e.g. "v0.0.1"); the canonical
          // reference must identify the artifact, so combine name + tag.
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
  }

  return { tools, cleanup }
}
