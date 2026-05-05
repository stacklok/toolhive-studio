import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'
import {
  groupInstalledSkills,
  useAvailableSkills,
} from '../use-available-skills'
import { mockedGetApiV1BetaSkills } from '@/common/mocks/fixtures/skills/get'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('groupInstalledSkills', () => {
  it('returns an empty array for nullish or empty input', () => {
    expect(groupInstalledSkills(undefined)).toEqual([])
    expect(groupInstalledSkills([])).toEqual([])
  })

  it('skips skills without a usable name', () => {
    const raw: InstalledSkill[] = [
      {
        reference: 'no-name',
        scope: 'user',
        clients: ['claude-code'],
        // metadata missing entirely
      },
      {
        reference: 'blank',
        scope: 'user',
        clients: ['claude-code'],
        metadata: { name: '   ' },
      },
      {
        reference: 'kept',
        scope: 'user',
        clients: ['claude-code'],
        metadata: { name: 'kept' },
      },
    ]
    const result = groupInstalledSkills(raw)
    expect(result.map((s) => s.name)).toEqual(['kept'])
  })

  it('trims whitespace around metadata.name and description', () => {
    const raw: InstalledSkill[] = [
      {
        reference: 'foo',
        scope: 'user',
        clients: ['claude-code'],
        metadata: { name: '  foo  ', description: '  hello  ' },
      },
    ]
    const [skill] = groupInstalledSkills(raw)
    expect(skill?.name).toBe('foo')
    expect(skill?.description).toBe('hello')
  })

  it('builds a user-scope variant with no projectRoot', () => {
    const raw: InstalledSkill[] = [
      {
        reference: 'only-user',
        scope: 'user',
        clients: ['claude-code'],
        metadata: { name: 'only-user', description: 'u' },
      },
    ]
    const [skill] = groupInstalledSkills(raw)
    expect(skill?.variants).toEqual([{ scope: 'user' }])
  })

  it('builds a project-scope variant carrying the trimmed projectRoot', () => {
    const raw: InstalledSkill[] = [
      {
        reference: 'proj',
        scope: 'project',
        project_root: '  /home/user/project  ',
        clients: ['claude-code'],
        metadata: { name: 'proj', description: 'p' },
      },
    ]
    const [skill] = groupInstalledSkills(raw)
    expect(skill?.variants).toEqual([
      { scope: 'project', projectRoot: '/home/user/project' },
    ])
  })

  it('treats unknown scope values as user', () => {
    const raw: InstalledSkill[] = [
      {
        reference: 'weird',
        // deliberately invalid scope value to mimic an unexpected payload
        scope: 'weird' as unknown as 'user',
        clients: ['claude-code'],
        metadata: { name: 'weird' },
      },
    ]
    const [skill] = groupInstalledSkills(raw)
    expect(skill?.variants).toEqual([{ scope: 'user' }])
  })

  it('dedups multiple records with the same name into one entry with N variants', () => {
    const raw: InstalledSkill[] = [
      {
        reference: 'shared',
        scope: 'project',
        project_root: '/repo-b',
        clients: ['cline'],
        metadata: { name: 'shared', description: 'd' },
      },
      {
        reference: 'shared',
        scope: 'user',
        clients: ['claude-code'],
        metadata: { name: 'shared', description: 'd' },
      },
      {
        reference: 'shared',
        scope: 'project',
        project_root: '/repo-a',
        clients: ['claude-code'],
        metadata: { name: 'shared', description: 'd' },
      },
    ]
    const result = groupInstalledSkills(raw)
    expect(result).toHaveLength(1)
    expect(result[0]?.variants).toEqual([
      { scope: 'user' },
      { scope: 'project', projectRoot: '/repo-a' },
      { scope: 'project', projectRoot: '/repo-b' },
    ])
  })

  it('keeps two project variants when no user install exists, sorted by projectRoot', () => {
    const raw: InstalledSkill[] = [
      {
        reference: 'twins',
        scope: 'project',
        project_root: '/beta',
        clients: ['claude-code'],
        metadata: { name: 'twins', description: 't' },
      },
      {
        reference: 'twins',
        scope: 'project',
        project_root: '/alpha',
        clients: ['cline'],
        metadata: { name: 'twins', description: 't' },
      },
    ]
    const [skill] = groupInstalledSkills(raw)
    expect(skill?.variants).toEqual([
      { scope: 'project', projectRoot: '/alpha' },
      { scope: 'project', projectRoot: '/beta' },
    ])
  })

  it('inherits description and version from the first non-empty record across a dedup group', () => {
    const raw: InstalledSkill[] = [
      {
        reference: 'inherit',
        scope: 'user',
        clients: ['claude-code'],
        metadata: { name: 'inherit', description: '' },
      },
      {
        reference: 'inherit',
        scope: 'project',
        project_root: '/proj',
        clients: ['claude-code'],
        metadata: {
          name: 'inherit',
          description: 'from project',
          version: 'v1.2.3',
        },
      },
    ]
    const [skill] = groupInstalledSkills(raw)
    expect(skill?.description).toBe('from project')
    expect(skill?.version).toBe('v1.2.3')
  })

  it('sorts the final list alphabetically by skill name', () => {
    const raw: InstalledSkill[] = [
      {
        reference: 'charlie',
        scope: 'user',
        clients: ['claude-code'],
        metadata: { name: 'charlie' },
      },
      {
        reference: 'alpha',
        scope: 'user',
        clients: ['claude-code'],
        metadata: { name: 'alpha' },
      },
      {
        reference: 'bravo',
        scope: 'user',
        clients: ['claude-code'],
        metadata: { name: 'bravo' },
      },
    ]
    const result = groupInstalledSkills(raw)
    expect(result.map((s) => s.name)).toEqual(['alpha', 'bravo', 'charlie'])
  })

  it('omits version on the grouped entry when no record has a version', () => {
    const raw: InstalledSkill[] = [
      {
        reference: 'no-version',
        scope: 'user',
        clients: ['claude-code'],
        metadata: { name: 'no-version', description: 'x' },
      },
    ]
    const [skill] = groupInstalledSkills(raw)
    expect(skill).not.toHaveProperty('version')
  })
})

describe('useAvailableSkills', () => {
  beforeEach(() => {
    window.electronAPI = {
      ...(window.electronAPI ?? {}),
      chat: {
        ...(window.electronAPI?.chat ?? {}),
        getEnabledSkills: vi.fn().mockResolvedValue([]),
      },
    } as unknown as typeof window.electronAPI
  })

  it('exposes a deduped availableSkills list, an enabledSet, and a live enabledCount', async () => {
    mockedGetApiV1BetaSkills.override(() => ({
      skills: [
        {
          reference: 'shared',
          scope: 'user',
          clients: ['claude-code'],
          metadata: { name: 'shared', description: 'shared skill' },
        },
        {
          reference: 'shared',
          scope: 'project',
          project_root: '/repo',
          clients: ['cline'],
          metadata: { name: 'shared', description: 'shared skill' },
        },
        {
          reference: 'solo',
          scope: 'user',
          clients: ['claude-code'],
          metadata: { name: 'solo', description: 'solo skill' },
        },
      ],
    }))
    vi.mocked(window.electronAPI.chat.getEnabledSkills).mockResolvedValue([
      'shared',
    ])

    const { result } = renderHook(() => useAvailableSkills(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.availableSkills).toHaveLength(2)
    })
    await waitFor(() => {
      expect(result.current.enabledNames).toEqual(['shared'])
    })

    expect(result.current.availableSkills.map((s) => s.name)).toEqual([
      'shared',
      'solo',
    ])
    const shared = result.current.availableSkills.find(
      (s) => s.name === 'shared'
    )
    expect(shared?.variants).toEqual([
      { scope: 'user' },
      { scope: 'project', projectRoot: '/repo' },
    ])
    expect(result.current.enabledSet.has('shared')).toBe(true)
    expect(result.current.enabledSet.has('solo')).toBe(false)
    expect(result.current.enabledCount).toBe(1)
  })

  it('returns an empty list and zero count when no skills are installed', async () => {
    mockedGetApiV1BetaSkills.activateScenario('empty')
    vi.mocked(window.electronAPI.chat.getEnabledSkills).mockResolvedValue([])

    const { result } = renderHook(() => useAvailableSkills(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.availableSkills).toEqual([])
    expect(result.current.enabledCount).toBe(0)
  })

  it('ignores stale enabled names that no longer match any installed skill', async () => {
    mockedGetApiV1BetaSkills.override(() => ({
      skills: [
        {
          reference: 'present',
          scope: 'user',
          clients: ['claude-code'],
          metadata: { name: 'present' },
        },
      ],
    }))
    vi.mocked(window.electronAPI.chat.getEnabledSkills).mockResolvedValue([
      'present',
      'uninstalled',
    ])

    const { result } = renderHook(() => useAvailableSkills(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.availableSkills).toHaveLength(1)
    })

    // Enabled count only reflects skills that are still installed.
    expect(result.current.enabledCount).toBe(1)
    // The stale name is still in the raw allow-list so the settings layer
    // can prune it on the next refresh, but the UI-facing count isn't
    // inflated by it.
    expect(result.current.enabledSet.has('uninstalled')).toBe(true)
  })

  it('passes the live install-name set to getEnabledSkills so the main process prunes', async () => {
    // Reverse-sorted on purpose to verify the hook normalizes ordering before
    // sending — otherwise the queryKey would churn on backend reordering.
    mockedGetApiV1BetaSkills.override(() => ({
      skills: [
        {
          reference: 'zeta',
          scope: 'user',
          clients: ['claude-code'],
          metadata: { name: 'zeta' },
        },
        {
          reference: 'alpha',
          scope: 'user',
          clients: ['claude-code'],
          metadata: { name: 'alpha' },
        },
      ],
    }))
    const getEnabledSkills = vi.mocked(window.electronAPI.chat.getEnabledSkills)
    getEnabledSkills.mockResolvedValue([])

    renderHook(() => useAvailableSkills(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(getEnabledSkills).toHaveBeenCalledWith(['alpha', 'zeta'])
    })
  })
})
