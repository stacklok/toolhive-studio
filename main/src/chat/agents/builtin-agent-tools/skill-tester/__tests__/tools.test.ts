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

vi.mock('@common/api/generated/sdk.gen', () => ({
  getApiV1BetaSkills: mockGetApiV1BetaSkills,
}))
vi.mock('@common/api/generated/client', () => ({
  createClient: mockCreateClient,
}))
vi.mock('../../../../../toolhive-manager', () => ({
  getToolhivePort: mockGetToolhivePort,
}))
vi.mock('../../../../../headers', () => ({
  getHeaders: mockGetHeaders,
}))
vi.mock('../../../../../logger', () => ({ default: mockLog }))

import { createSkillTesterAgentTools } from '../tools'

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
  mockLog.warn.mockClear()
  mockLog.info.mockClear()
  mockLog.error.mockClear()
  homeRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), `skill-tester-home-${nanoid(6)}-`)
  )
})

afterEach(async () => {
  await fs.rm(homeRoot, { recursive: true, force: true }).catch(() => {})
})

interface BuildOptions {
  homeDir?: string
  buildClient?: () => unknown
}

async function buildHandle(options: BuildOptions = {}) {
  const handle = await createSkillTesterAgentTools({
    buildClient: (options.buildClient ?? (() => ({}))) as Parameters<
      typeof createSkillTesterAgentTools
    >[0] extends infer X
      ? X extends { buildClient?: infer F }
        ? F
        : never
      : never,
    homeDir: options.homeDir ?? homeRoot,
  })
  return handle
}

describe('skill-tester tools — list_skills', () => {
  it('reports a friendly error when ToolHive is not running', async () => {
    mockGetToolhivePort.mockReturnValue(null)
    const handle = await createSkillTesterAgentTools({
      buildClient: () => null,
      homeDir: homeRoot,
    })
    const tool = handle.tools.list_skills as unknown as {
      execute: (input: unknown) => Promise<unknown>
    }
    const result = (await tool.execute({})) as { error: string }
    expect(result.error).toMatch(/ToolHive is not running/i)
  })

  it('returns the user-scope skills returned by ToolHive', async () => {
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
    const tool = handle.tools.list_skills as unknown as {
      execute: (input: unknown) => Promise<unknown>
    }
    const result = (await tool.execute({})) as {
      skills: Array<{ name: string; description: string; clients: string[] }>
    }
    expect(result.skills).toEqual([
      expect.objectContaining({
        name: 'algorithmic-art',
        description: 'Algorithmic art with p5.js',
        clients: ['claude-code'],
      }),
    ])
  })
})

describe('skill-tester tools — load_skill', () => {
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
    expect(result.error).toMatch(/No installed user-scope skill/i)
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

describe('skill-tester tools — read_skill_file', () => {
  beforeEach(async () => {
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

describe('skill-tester tools — list_skill_tree', () => {
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

describe('skill-tester tools — cleanup', () => {
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
    // After cleanup the in-memory cache is reset, so read_skill_file must
    // surface "not loaded" again.
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

describe('skill-tester tools — instructionsSuffix', () => {
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

  it('shows a friendly empty-state message when there are no skills', async () => {
    mockGetApiV1BetaSkills.mockResolvedValue({
      data: { skills: [] },
      error: undefined,
    })
    const handle = await buildHandle()
    expect(handle.instructionsSuffix).toContain(
      'No user-scoped skills are currently installed'
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
})
