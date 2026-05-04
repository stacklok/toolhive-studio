import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { nanoid } from 'nanoid'

const mockGetApiV1BetaSkills = vi.hoisted(() => vi.fn())
const mockCreateClient = vi.hoisted(() =>
  vi.fn(() => ({}) as { __fake__: true })
)
const mockGetToolhivePort = vi.hoisted(() => vi.fn())
const mockGetHeaders = vi.hoisted(() => vi.fn(() => ({})))
const mockLog = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))
const mockGetEnabledSkills = vi.hoisted(() => vi.fn<() => string[]>(() => []))
const mockPruneEnabledSkillsTo = vi.hoisted(() =>
  vi.fn<(names: readonly string[]) => number>(() => 0)
)

// Authoring SDK endpoints are unused in these tests; stub to avoid surprises.
const mockPostApiV1BetaSkillsBuild = vi.hoisted(() => vi.fn())
const mockGetApiV1BetaSkillsBuilds = vi.hoisted(() => vi.fn())

vi.mock('@common/api/generated/sdk.gen', () => ({
  getApiV1BetaSkills: mockGetApiV1BetaSkills,
  postApiV1BetaSkillsBuild: mockPostApiV1BetaSkillsBuild,
  getApiV1BetaSkillsBuilds: mockGetApiV1BetaSkillsBuilds,
}))
vi.mock('@common/api/generated/client', () => ({
  createClient: mockCreateClient,
}))
vi.mock('../../../../toolhive-manager', () => ({
  getToolhivePort: mockGetToolhivePort,
}))
vi.mock('../../../../headers', () => ({
  getHeaders: mockGetHeaders,
}))
vi.mock('../../../../logger', () => ({ default: mockLog }))
vi.mock('../../../settings-storage', () => ({
  getEnabledSkills: mockGetEnabledSkills,
  pruneEnabledSkillsTo: mockPruneEnabledSkillsTo,
}))
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => os.tmpdir()),
  },
}))

import { createSkillsAgentTools } from '../skills'

let homeRoot: string

async function ensureClientSkill(
  homeDir: string,
  clientSubdir: string,
  skillName: string,
  files: Record<string, string>
): Promise<string> {
  const skillDir = path.join(homeDir, clientSubdir, 'skills', skillName)
  await fs.mkdir(skillDir, { recursive: true })
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(skillDir, rel)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, content)
  }
  return skillDir
}

beforeEach(async () => {
  mockGetApiV1BetaSkills.mockReset()
  mockGetToolhivePort.mockReset()
  mockGetEnabledSkills.mockReset()
  mockGetEnabledSkills.mockImplementation(() => [])
  mockPruneEnabledSkillsTo.mockReset()
  mockPruneEnabledSkillsTo.mockImplementation(() => 0)
  mockPostApiV1BetaSkillsBuild.mockReset()
  mockGetApiV1BetaSkillsBuilds.mockReset()
  mockLog.warn.mockClear()
  mockLog.info.mockClear()
  mockLog.error.mockClear()
  homeRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), `skills-home-${nanoid(6)}-`)
  )
})

afterEach(async () => {
  await fs.rm(homeRoot, { recursive: true, force: true }).catch(() => {})
})

interface BuildOptions {
  homeDir?: string
  buildClient?: () => unknown
  /**
   * Override the enabled-skills allow-list seen by the Skills bundle.
   * - `undefined` (default): auto-enable every skill the current API mock
   *   returns, so discovery-agnostic tests behave identically regardless of
   *   the picker state.
   * - `string[]`: exact allow-list used for this build.
   */
  enabled?: string[]
}

async function buildHandle(options: BuildOptions = {}) {
  let enabled: string[]
  if (options.enabled) {
    enabled = options.enabled
  } else {
    const result = (await mockGetApiV1BetaSkills({})) as
      | { data?: { skills?: Array<{ metadata?: { name?: string } }> } }
      | undefined
    enabled = (result?.data?.skills ?? [])
      .map((s) => s.metadata?.name?.trim())
      .filter((n): n is string => !!n)
  }
  mockGetEnabledSkills.mockImplementation(() => enabled)

  return createSkillsAgentTools({
    buildClient: (options.buildClient ?? (() => ({}))) as Parameters<
      typeof createSkillsAgentTools
    >[0] extends infer X
      ? X extends { buildClient?: infer F }
        ? F
        : never
      : never,
    homeDir: options.homeDir ?? homeRoot,
  })
}

describe('skills bundle — list_skills', () => {
  it('reports a friendly error when ToolHive is not running', async () => {
    mockGetToolhivePort.mockReturnValue(null)
    const handle = await createSkillsAgentTools({
      buildClient: () => null,
      homeDir: homeRoot,
    })
    const tool = handle.tools.list_skills as unknown as {
      execute: (input: unknown) => Promise<unknown>
    }
    const result = (await tool.execute({})) as { error: string }
    expect(result.error).toMatch(/ToolHive is not running/i)
  })

  it('returns the installed skills returned by ToolHive as variants', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'algorithmic-art',
            clients: ['claude-code'],
            scope: 'user',
            metadata: {
              name: 'algorithmic-art',
              description: 'Algorithmic art with p5.js',
              version: 'v0.0.1',
            },
          },
        ],
      },
      error: undefined,
    })
    const handle = await buildHandle()
    const tool = handle.tools.list_skills as unknown as {
      execute: (input: unknown) => Promise<unknown>
    }
    const result = (await tool.execute({})) as {
      skills: Array<{
        name: string
        description: string
        variants: Array<{
          scope: 'user' | 'project'
          projectRoot?: string
          clients: string[]
        }>
      }>
    }
    expect(result.skills).toEqual([
      expect.objectContaining({
        name: 'algorithmic-art',
        description: 'Algorithmic art with p5.js',
        variants: [{ scope: 'user', clients: ['claude-code'] }],
      }),
    ])
  })
})

describe('skills bundle — load_skill', () => {
  it('refuses unknown skills with a clear error', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: { skills: [] },
      error: undefined,
    })
    const handle = await buildHandle()
    const result = (await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'does-not-exist' })) as { error: string }
    expect(result.error).toMatch(/No installed skill/i)
  })

  it('errors when the InstalledSkill record has no clients', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'algorithmic-art',
            clients: [],
            metadata: { name: 'algorithmic-art', description: '' },
          },
        ],
      },
      error: undefined,
    })
    const handle = await buildHandle()
    const result = (await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'algorithmic-art' })) as { error: string }
    expect(result.error).toMatch(/no associated clients/i)
  })

  it('reports every candidate path when no install dir exists', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'algorithmic-art',
            clients: ['claude-code', 'cline'],
            metadata: { name: 'algorithmic-art', description: '' },
          },
        ],
      },
      error: undefined,
    })
    const handle = await buildHandle()
    const result = (await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'algorithmic-art' })) as { error: string }
    expect(result.error).toMatch(/Could not find an on-disk install/i)
    expect(result.error).toContain(
      path.join(homeRoot, '.claude', 'skills', 'algorithmic-art')
    )
    expect(result.error).toContain(
      path.join(homeRoot, '.cline', 'skills', 'algorithmic-art')
    )
  })

  it('picks the first client whose install dir exists, in order', async () => {
    await ensureClientSkill(homeRoot, '.cline', 'algorithmic-art', {
      'SKILL.md': '# cline copy\n',
    })
    await ensureClientSkill(homeRoot, '.claude', 'algorithmic-art', {
      'SKILL.md': '# claude copy\n',
    })
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'algorithmic-art',
            clients: ['claude-code', 'cline'],
            metadata: {
              name: 'algorithmic-art',
              description: '',
              version: 'v0',
            },
          },
        ],
      },
      error: undefined,
    })
    const handle = await buildHandle()
    const result = (await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'algorithmic-art' })) as {
      name: string
      version: string
      client: string
      dir: string
      body: string
      files: Array<{ path: string; size: number }>
      cached: boolean
    }
    expect(result.client).toBe('claude-code')
    expect(result.body).toBe('# claude copy\n')
    expect(result.dir).toBe(
      path.join(homeRoot, '.claude', 'skills', 'algorithmic-art')
    )
    expect(result.cached).toBe(false)
  })

  it('falls back to the next client when the first is not materialized on disk', async () => {
    await ensureClientSkill(homeRoot, '.cline', 'algorithmic-art', {
      'SKILL.md': '# cline copy\n',
      'scripts/run.sh': '#!/bin/sh\necho hi\n',
    })
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'algorithmic-art',
            clients: ['claude-code', 'cline'],
            metadata: { name: 'algorithmic-art', description: '' },
          },
        ],
      },
      error: undefined,
    })
    const handle = await buildHandle()
    const result = (await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'algorithmic-art' })) as {
      client: string
      body: string
      files: Array<{ path: string }>
    }
    expect(result.client).toBe('cline')
    expect(result.body).toBe('# cline copy\n')
    expect(result.files.map((f) => f.path).sort()).toEqual(
      ['SKILL.md', path.join('scripts', 'run.sh')].sort()
    )
  })

  it('falls back to `.<clientId>` for unknown client identifiers', async () => {
    await ensureClientSkill(homeRoot, '.totally-new-client', 'foo', {
      'SKILL.md': '# new client\n',
    })
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'foo',
            clients: ['totally-new-client'],
            metadata: { name: 'foo', description: '' },
          },
        ],
      },
      error: undefined,
    })
    const handle = await buildHandle()
    const result = (await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'foo' })) as {
      client: string
      body: string
      dir: string
    }
    expect(result.client).toBe('totally-new-client')
    expect(result.body).toBe('# new client\n')
    expect(result.dir).toBe(
      path.join(homeRoot, '.totally-new-client', 'skills', 'foo')
    )
  })

  it('returns cached metadata on a second load with cached: true', async () => {
    await ensureClientSkill(homeRoot, '.claude', 'algorithmic-art', {
      'SKILL.md': '# cached\n',
    })
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'algorithmic-art',
            clients: ['claude-code'],
            metadata: { name: 'algorithmic-art', description: '' },
          },
        ],
      },
      error: undefined,
    })
    const handle = await buildHandle()
    const exec = handle.tools.load_skill as unknown as {
      execute: (input: unknown) => Promise<unknown>
    }
    const first = (await exec.execute({ name: 'algorithmic-art' })) as {
      cached: boolean
    }
    expect(first.cached).toBe(false)
    const second = (await exec.execute({ name: 'algorithmic-art' })) as {
      cached: boolean
    }
    expect(second.cached).toBe(true)
  })

  it('errors clearly when the install dir is missing SKILL.md', async () => {
    const skillDir = path.join(homeRoot, '.claude', 'skills', 'algorithmic-art')
    await fs.mkdir(skillDir, { recursive: true })
    await fs.writeFile(path.join(skillDir, 'README.md'), 'hi')
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'algorithmic-art',
            clients: ['claude-code'],
            metadata: { name: 'algorithmic-art', description: '' },
          },
        ],
      },
      error: undefined,
    })
    const handle = await buildHandle()
    const result = (await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'algorithmic-art' })) as { error: string }
    expect(result.error).toMatch(/No SKILL\.md found/i)
  })
})

describe('skills bundle — read_skill_file', () => {
  beforeEach(() => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'algorithmic-art',
            clients: ['claude-code'],
            metadata: { name: 'algorithmic-art', description: '' },
          },
        ],
      },
      error: undefined,
    })
  })

  async function loadDefault() {
    await ensureClientSkill(homeRoot, '.claude', 'algorithmic-art', {
      'SKILL.md': '# default\n',
      'scripts/run.sh': '#!/bin/sh\necho hi\n',
    })
    const handle = await buildHandle()
    await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'algorithmic-art' })
    return handle
  }

  it('returns the file content for a relative path', async () => {
    const handle = await loadDefault()
    const result = (await (
      handle.tools.read_skill_file as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({
      name: 'algorithmic-art',
      path: 'scripts/run.sh',
    })) as { content: string; truncated: boolean }
    expect(result.content).toContain('echo hi')
    expect(result.truncated).toBe(false)
  })

  it('rejects absolute paths', async () => {
    const handle = await loadDefault()
    const result = (await (
      handle.tools.read_skill_file as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({
      name: 'algorithmic-art',
      path: '/etc/passwd',
    })) as { error: string }
    expect(result.error).toMatch(/Invalid path/i)
  })

  it('rejects parent traversal', async () => {
    const handle = await loadDefault()
    const result = (await (
      handle.tools.read_skill_file as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({
      name: 'algorithmic-art',
      path: '../escape',
    })) as { error: string }
    expect(result.error).toMatch(/Invalid path/i)
  })

  it('errors when the skill is not loaded', async () => {
    const handle = await buildHandle()
    const result = (await (
      handle.tools.read_skill_file as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'never-loaded', path: 'foo' })) as { error: string }
    expect(result.error).toMatch(/not loaded/i)
  })

  it('truncates files larger than the cap', async () => {
    const big = Buffer.alloc(300 * 1024, 0x41).toString('utf8')
    await ensureClientSkill(homeRoot, '.claude', 'algorithmic-art', {
      'SKILL.md': '# big\n',
      'big.txt': big,
    })
    const handle = await buildHandle()
    await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'algorithmic-art' })
    const result = (await (
      handle.tools.read_skill_file as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({
      name: 'algorithmic-art',
      path: 'big.txt',
    })) as { truncated: boolean; content: string }
    expect(result.truncated).toBe(true)
    expect(result.content.length).toBe(256 * 1024)
  })
})

describe('skills bundle — list_skill_tree', () => {
  beforeEach(() => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'algorithmic-art',
            clients: ['claude-code'],
            metadata: { name: 'algorithmic-art', description: '' },
          },
        ],
      },
      error: undefined,
    })
  })

  it('lists every file under the install dir, sorted', async () => {
    await ensureClientSkill(homeRoot, '.claude', 'algorithmic-art', {
      'SKILL.md': '# x\n',
      'scripts/run.sh': '#!/bin/sh\n',
      'templates/page.html': '<html />',
    })
    const handle = await buildHandle()
    await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'algorithmic-art' })
    const result = (await (
      handle.tools.list_skill_tree as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'algorithmic-art' })) as {
      entries: Array<{ path: string; size: number }>
      truncated: boolean
    }
    const paths = result.entries.map((e) => e.path)
    expect(paths).toEqual(
      [
        'SKILL.md',
        path.join('scripts', 'run.sh'),
        path.join('templates', 'page.html'),
      ].sort()
    )
    expect(result.truncated).toBe(false)
  })

  it('errors when the skill is not loaded', async () => {
    const handle = await buildHandle()
    const result = (await (
      handle.tools.list_skill_tree as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'nope' })) as { error: string }
    expect(result.error).toMatch(/not loaded/i)
  })
})

describe('skills bundle — cleanup', () => {
  it('clears the loaded cache without throwing', async () => {
    await ensureClientSkill(homeRoot, '.claude', 'algorithmic-art', {
      'SKILL.md': '# x\n',
    })
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'algorithmic-art',
            clients: ['claude-code'],
            metadata: { name: 'algorithmic-art', description: '' },
          },
        ],
      },
      error: undefined,
    })
    const handle = await buildHandle()
    await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'algorithmic-art' })
    await expect(handle.cleanup()).resolves.toBeUndefined()
    const result = (await (
      handle.tools.read_skill_file as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'algorithmic-art', path: 'SKILL.md' })) as {
      error: string
    }
    expect(result.error).toMatch(/not loaded/i)
  })
})

describe('skills bundle — instructionsSuffix', () => {
  it('lists installed skills when the API succeeds', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'algorithmic-art',
            clients: ['claude-code'],
            metadata: {
              name: 'algorithmic-art',
              description: 'Algorithmic art with p5.js',
              version: 'v0.0.1',
            },
          },
        ],
      },
      error: undefined,
    })
    const handle = await buildHandle()
    expect(handle.instructionsSuffix).toContain('algorithmic-art')
    expect(handle.instructionsSuffix).toContain('Algorithmic art with p5.js')
  })

  it('shows a friendly empty-state message when nothing is installed', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: { skills: [] },
      error: undefined,
    })
    const handle = await buildHandle()
    expect(handle.instructionsSuffix).toContain(
      'No skills are currently installed'
    )
  })

  it('reports the failure reason when the API returns an error', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: undefined,
      error: 'oops',
    })
    const handle = await buildHandle()
    expect(handle.instructionsSuffix).toContain(
      'Could not load installed skills'
    )
    expect(handle.instructionsSuffix).toContain('oops')
  })

  it('prompts the user to enable a skill when some are installed but none selected', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: {
        skills: [
          {
            reference: 'algorithmic-art',
            clients: ['claude-code'],
            metadata: {
              name: 'algorithmic-art',
              description: 'Algorithmic art with p5.js',
              version: 'v0',
            },
          },
        ],
      },
      error: undefined,
    })
    const handle = await buildHandle({ enabled: [] })
    expect(handle.instructionsSuffix).toContain('No skills are enabled')
    expect(handle.instructionsSuffix).toContain('Skills dropdown')
    expect(handle.instructionsSuffix).not.toContain('algorithmic-art')
  })
})

describe('skills bundle — enabled-skills filter', () => {
  const twoSkillsPayload = {
    data: {
      skills: [
        {
          reference: 'algorithmic-art',
          clients: ['claude-code'],
          metadata: {
            name: 'algorithmic-art',
            description: 'Algorithmic art with p5.js',
            version: 'v0',
          },
        },
        {
          reference: 'security-review',
          clients: ['claude-code'],
          metadata: {
            name: 'security-review',
            description: 'Audit diffs for security issues',
            version: 'v1',
          },
        },
      ],
    },
    error: undefined,
  }

  it('returns an empty list_skills result when nothing is enabled', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue(twoSkillsPayload)
    const handle = await buildHandle({ enabled: [] })
    const tool = handle.tools.list_skills as unknown as {
      execute: (input: unknown) => Promise<unknown>
    }
    const result = (await tool.execute({})) as {
      skills: Array<{ name: string }>
    }
    expect(result.skills).toEqual([])
  })

  it('filters list_skills to the enabled allow-list only', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue(twoSkillsPayload)
    const handle = await buildHandle({ enabled: ['security-review'] })
    const tool = handle.tools.list_skills as unknown as {
      execute: (input: unknown) => Promise<unknown>
    }
    const result = (await tool.execute({})) as {
      skills: Array<{ name: string }>
    }
    expect(result.skills.map((s) => s.name)).toEqual(['security-review'])
  })

  it('re-reads the enabled set on each list_skills call (no handle rebuild)', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue(twoSkillsPayload)
    const handle = await buildHandle({ enabled: [] })
    const tool = handle.tools.list_skills as unknown as {
      execute: (input: unknown) => Promise<unknown>
    }
    mockGetEnabledSkills.mockImplementation(() => ['algorithmic-art'])
    const result = (await tool.execute({})) as {
      skills: Array<{ name: string }>
    }
    expect(result.skills.map((s) => s.name)).toEqual(['algorithmic-art'])
  })

  it('load_skill refuses skills that are installed but not enabled', async () => {
    await ensureClientSkill(homeRoot, '.claude', 'security-review', {
      'SKILL.md': '# sec\n',
    })
    mockGetApiV1BetaSkills.mockResolvedValue(twoSkillsPayload)
    const handle = await buildHandle({ enabled: ['algorithmic-art'] })
    const result = (await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'security-review' })) as { error: string }
    expect(result.error).toMatch(/not enabled for this chat/i)
    expect(result.error).toMatch(/Skills picker/i)
  })

  it('load_skill still reports unknown names, even when enabled is empty', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue(twoSkillsPayload)
    const handle = await buildHandle({ enabled: [] })
    const result = (await (
      handle.tools.load_skill as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
    ).execute({ name: 'never-heard-of-this' })) as { error: string }
    expect(result.error).toMatch(/No installed skill/i)
  })

  it('prunes stale enabled-skill rows after a successful refresh', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue(twoSkillsPayload)
    await buildHandle({ enabled: [] })
    expect(mockPruneEnabledSkillsTo).toHaveBeenCalledWith([
      'algorithmic-art',
      'security-review',
    ])
  })

  it('does not prune when the API refresh returns zero skills', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: { skills: [] },
      error: undefined,
    })
    await buildHandle()
    expect(mockPruneEnabledSkillsTo).not.toHaveBeenCalled()
  })

  it('does not prune when the API refresh errors', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: undefined,
      error: 'boom',
    })
    await buildHandle()
    expect(mockPruneEnabledSkillsTo).not.toHaveBeenCalled()
  })

  it('load_skill rejects a previously-cached skill after it gets disabled', async () => {
    await ensureClientSkill(homeRoot, '.claude', 'algorithmic-art', {
      'SKILL.md': '# art\n',
    })
    mockGetApiV1BetaSkills.mockResolvedValue(twoSkillsPayload)
    const handle = await buildHandle({ enabled: ['algorithmic-art'] })
    const exec = handle.tools.load_skill as unknown as {
      execute: (input: unknown) => Promise<unknown>
    }
    const first = (await exec.execute({ name: 'algorithmic-art' })) as {
      cached: boolean
    }
    expect(first.cached).toBe(false)
    mockGetEnabledSkills.mockImplementation(() => [])
    const second = (await exec.execute({ name: 'algorithmic-art' })) as {
      error?: string
    }
    expect(second.error).toMatch(/not enabled for this chat/i)
  })
})

describe('skills bundle — project-scope installs', () => {
  it('resolves a project-only skill to its projectRoot install and reports scope', async () => {
    const projectRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), `skills-project-${nanoid(6)}-`)
    )
    try {
      await ensureClientSkill(projectRoot, '.claude', 'only-project', {
        'SKILL.md': '# project only\n',
      })
      mockGetApiV1BetaSkills.mockResolvedValue({
        data: {
          skills: [
            {
              reference: 'only-project',
              clients: ['claude-code'],
              scope: 'project',
              project_root: projectRoot,
              metadata: { name: 'only-project', description: 'proj' },
            },
          ],
        },
        error: undefined,
      })
      const handle = await buildHandle()
      const result = (await (
        handle.tools.load_skill as unknown as {
          execute: (input: unknown) => Promise<unknown>
        }
      ).execute({ name: 'only-project' })) as {
        scope: 'user' | 'project'
        projectRoot?: string
        client: string
        dir: string
        body: string
      }
      expect(result.scope).toBe('project')
      expect(result.projectRoot).toBe(projectRoot)
      expect(result.client).toBe('claude-code')
      expect(result.dir).toBe(
        path.join(projectRoot, '.claude', 'skills', 'only-project')
      )
      expect(result.body).toBe('# project only\n')
    } finally {
      await fs.rm(projectRoot, { recursive: true, force: true }).catch(() => {})
    }
  })

  it('falls back to a project install when the user install is missing on disk', async () => {
    const projectRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), `skills-project-${nanoid(6)}-`)
    )
    try {
      // Only materialize the project install - the user variant is listed in the
      // API but its home dir is deliberately not created.
      await ensureClientSkill(projectRoot, '.claude', 'shared', {
        'SKILL.md': '# from project\n',
      })
      mockGetApiV1BetaSkills.mockResolvedValue({
        data: {
          skills: [
            {
              reference: 'shared',
              clients: ['claude-code'],
              scope: 'user',
              metadata: { name: 'shared', description: 'shared skill' },
            },
            {
              reference: 'shared',
              clients: ['claude-code'],
              scope: 'project',
              project_root: projectRoot,
              metadata: { name: 'shared', description: 'shared skill' },
            },
          ],
        },
        error: undefined,
      })
      const handle = await buildHandle()
      const result = (await (
        handle.tools.load_skill as unknown as {
          execute: (input: unknown) => Promise<unknown>
        }
      ).execute({ name: 'shared' })) as {
        scope: 'user' | 'project'
        projectRoot?: string
        body: string
      }
      expect(result.scope).toBe('project')
      expect(result.projectRoot).toBe(projectRoot)
      expect(result.body).toBe('# from project\n')
    } finally {
      await fs.rm(projectRoot, { recursive: true, force: true }).catch(() => {})
    }
  })

  it('dedups same-name skills installed in two project roots into a single list_skills entry', async () => {
    const projectA = await fs.mkdtemp(
      path.join(os.tmpdir(), `skills-project-a-${nanoid(6)}-`)
    )
    const projectB = await fs.mkdtemp(
      path.join(os.tmpdir(), `skills-project-b-${nanoid(6)}-`)
    )
    try {
      mockGetApiV1BetaSkills.mockResolvedValue({
        data: {
          skills: [
            {
              reference: 'twins',
              clients: ['claude-code'],
              scope: 'project',
              project_root: projectA,
              metadata: { name: 'twins', description: 'twin skill' },
            },
            {
              reference: 'twins',
              clients: ['cline'],
              scope: 'project',
              project_root: projectB,
              metadata: { name: 'twins', description: 'twin skill' },
            },
          ],
        },
        error: undefined,
      })
      const handle = await buildHandle()
      const tool = handle.tools.list_skills as unknown as {
        execute: (input: unknown) => Promise<unknown>
      }
      const result = (await tool.execute({})) as {
        skills: Array<{
          name: string
          variants: Array<{
            scope: 'user' | 'project'
            projectRoot?: string
            clients: string[]
          }>
        }>
      }
      expect(result.skills).toHaveLength(1)
      expect(result.skills[0]?.name).toBe('twins')
      const variantRoots = result.skills[0]?.variants.map((v) => v.projectRoot)
      expect(new Set(variantRoots)).toEqual(new Set([projectA, projectB]))
      expect(
        result.skills[0]?.variants.every((v) => v.scope === 'project')
      ).toBe(true)
    } finally {
      await fs.rm(projectA, { recursive: true, force: true }).catch(() => {})
      await fs.rm(projectB, { recursive: true, force: true }).catch(() => {})
    }
  })

  it('lists every candidate across variants when no install dir exists anywhere', async () => {
    const projectRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), `skills-project-${nanoid(6)}-`)
    )
    try {
      mockGetApiV1BetaSkills.mockResolvedValue({
        data: {
          skills: [
            {
              reference: 'ghost',
              clients: ['claude-code'],
              scope: 'user',
              metadata: { name: 'ghost', description: '' },
            },
            {
              reference: 'ghost',
              clients: ['cline'],
              scope: 'project',
              project_root: projectRoot,
              metadata: { name: 'ghost', description: '' },
            },
          ],
        },
        error: undefined,
      })
      const handle = await buildHandle()
      const result = (await (
        handle.tools.load_skill as unknown as {
          execute: (input: unknown) => Promise<unknown>
        }
      ).execute({ name: 'ghost' })) as { error: string }
      expect(result.error).toMatch(/Could not find an on-disk install/i)
      expect(result.error).toContain(
        path.join(homeRoot, '.claude', 'skills', 'ghost')
      )
      expect(result.error).toContain(
        path.join(projectRoot, '.cline', 'skills', 'ghost')
      )
    } finally {
      await fs.rm(projectRoot, { recursive: true, force: true }).catch(() => {})
    }
  })
})
