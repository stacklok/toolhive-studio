import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSkillsHandle = {
  tools: { write_skill_files: {}, build_skill: {} },
  cleanup: vi.fn().mockResolvedValue(undefined),
}

vi.mock('../skills', () => ({
  createSkillsAgentTools: vi.fn(() => mockSkillsHandle),
}))

import { createBuiltinAgentTools } from '../index'
import { createSkillsAgentTools } from '../skills'

describe('createBuiltinAgentTools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an empty handle when key is null', async () => {
    const handle = createBuiltinAgentTools(null)
    expect(handle.tools).toEqual({})
    await expect(handle.cleanup()).resolves.toBeUndefined()
    expect(createSkillsAgentTools).not.toHaveBeenCalled()
  })

  it('returns an empty handle when key is undefined', () => {
    const handle = createBuiltinAgentTools(undefined)
    expect(handle.tools).toEqual({})
    expect(createSkillsAgentTools).not.toHaveBeenCalled()
  })

  it('delegates to createSkillsAgentTools when key is "skills"', () => {
    const handle = createBuiltinAgentTools('skills')
    expect(handle).toBe(mockSkillsHandle)
    expect(createSkillsAgentTools).toHaveBeenCalledTimes(1)
  })
})
