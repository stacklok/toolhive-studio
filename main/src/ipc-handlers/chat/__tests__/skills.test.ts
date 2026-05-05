import { describe, it, expect, vi, beforeEach } from 'vitest'

const ctx = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  return {
    handlers,
    getEnabledSkills: vi.fn<() => string[]>(() => []),
    pruneEnabledSkillsTo: vi.fn<(names: readonly string[]) => number>(() => 0),
    setSkillEnabled: vi.fn(() => ({ success: true })),
  }
})

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      ctx.handlers.set(channel, handler)
    },
  },
}))

vi.mock('../../../chat/settings-storage', () => ({
  getEnabledSkills: ctx.getEnabledSkills,
  pruneEnabledSkillsTo: ctx.pruneEnabledSkillsTo,
  setSkillEnabled: ctx.setSkillEnabled,
}))

import { register } from '../skills'

describe('chat/skills IPC handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ctx.handlers.clear()
    ctx.getEnabledSkills.mockImplementation(() => [])
    ctx.pruneEnabledSkillsTo.mockImplementation(() => 0)
    ctx.setSkillEnabled.mockImplementation(() => ({ success: true }))
    register()
  })

  describe('chat:get-enabled-skills', () => {
    it('returns the raw allow-list when called without an install-name hint', async () => {
      ctx.getEnabledSkills.mockReturnValue(['alpha', 'beta'])

      const handler = ctx.handlers.get('chat:get-enabled-skills')!
      const result = await handler(null)

      expect(result).toEqual(['alpha', 'beta'])
      expect(ctx.pruneEnabledSkillsTo).not.toHaveBeenCalled()
    })

    it('prunes against the provided install names before returning', async () => {
      // Simulate the renderer passing the freshly-fetched install set after
      // an install / uninstall: stale `enabled_skills` rows must be wiped in
      // the same round-trip rather than waiting for an agent to fire
      // `list_skills`.
      ctx.getEnabledSkills.mockReturnValue(['alpha'])

      const handler = ctx.handlers.get('chat:get-enabled-skills')!
      const result = await handler(null, ['alpha', 'beta'])

      expect(ctx.pruneEnabledSkillsTo).toHaveBeenCalledWith(['alpha', 'beta'])
      expect(result).toEqual(['alpha'])
    })

    it('prunes against an empty install list (user uninstalled their last skill)', async () => {
      // Empty array is a real signal — successful response, zero installs.
      // Must still trigger a prune so the allow-list does not retain stale
      // rows after the last skill is removed.
      ctx.getEnabledSkills.mockReturnValue([])

      const handler = ctx.handlers.get('chat:get-enabled-skills')!
      await handler(null, [])

      expect(ctx.pruneEnabledSkillsTo).toHaveBeenCalledWith([])
    })

    it('does not prune when the second argument is not an array', async () => {
      // Defensive: a malformed renderer call (e.g. `null` or an object) must
      // never wipe the allow-list. The IPC handler treats anything other
      // than an array as "no hint provided".
      const handler = ctx.handlers.get('chat:get-enabled-skills')!
      await handler(null, null)
      await handler(null, 'oops')

      expect(ctx.pruneEnabledSkillsTo).not.toHaveBeenCalled()
    })
  })

  describe('chat:set-enabled-skill', () => {
    it('forwards the toggle to settings storage', async () => {
      const handler = ctx.handlers.get('chat:set-enabled-skill')!
      await handler(null, 'foo', true)
      expect(ctx.setSkillEnabled).toHaveBeenCalledWith('foo', true)
    })
  })
})
