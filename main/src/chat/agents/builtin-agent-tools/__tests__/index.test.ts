import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSkillsHandle = {
  tools: {
    write_skill_files: {},
    build_skill: {},
    list_skills: {},
    load_skill: {},
    read_skill_file: {},
    list_skill_tree: {},
  },
  cleanup: vi.fn().mockResolvedValue(undefined),
  instructionsSuffix: '## Available installed skills (scope=user)\n\n- foo',
}

vi.mock('../skills', () => ({
  createSkillsAgentTools: vi.fn(() => Promise.resolve(mockSkillsHandle)),
}))

import { createBuiltinAgentTools } from '../index'
import { createSkillsAgentTools } from '../skills'

describe('createBuiltinAgentTools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an empty handle when key is null', async () => {
    const handle = await createBuiltinAgentTools(null)
    expect(handle.tools).toEqual({})
    await expect(handle.cleanup()).resolves.toBeUndefined()
    expect(createSkillsAgentTools).not.toHaveBeenCalled()
  })

  it('returns an empty handle when key is undefined', async () => {
    const handle = await createBuiltinAgentTools(undefined)
    expect(handle.tools).toEqual({})
    expect(createSkillsAgentTools).not.toHaveBeenCalled()
  })

  it('delegates to createSkillsAgentTools when key is "skills"', async () => {
    const handle = await createBuiltinAgentTools('skills')
    expect(handle).toBe(mockSkillsHandle)
    expect(handle.instructionsSuffix).toContain('Available installed skills')
    expect(createSkillsAgentTools).toHaveBeenCalledTimes(1)
  })
})
