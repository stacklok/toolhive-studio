import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSkillsHandle = {
  tools: { write_skill_files: {}, build_skill: {} },
  cleanup: vi.fn().mockResolvedValue(undefined),
}

const mockSkillTesterHandle = {
  tools: { list_skills: {}, load_skill: {} },
  cleanup: vi.fn().mockResolvedValue(undefined),
  instructionsSuffix: '## Available installed skills (scope=user)\n\n- foo',
}

vi.mock('../skills', () => ({
  createSkillsAgentTools: vi.fn(() => mockSkillsHandle),
}))

vi.mock('../skill-tester', () => ({
  createSkillTesterAgentTools: vi.fn(() =>
    Promise.resolve(mockSkillTesterHandle)
  ),
}))

import { createBuiltinAgentTools } from '../index'
import { createSkillsAgentTools } from '../skills'
import { createSkillTesterAgentTools } from '../skill-tester'

describe('createBuiltinAgentTools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an empty handle when key is null', async () => {
    const handle = await createBuiltinAgentTools(null)
    expect(handle.tools).toEqual({})
    await expect(handle.cleanup()).resolves.toBeUndefined()
    expect(createSkillsAgentTools).not.toHaveBeenCalled()
    expect(createSkillTesterAgentTools).not.toHaveBeenCalled()
  })

  it('returns an empty handle when key is undefined', async () => {
    const handle = await createBuiltinAgentTools(undefined)
    expect(handle.tools).toEqual({})
    expect(createSkillsAgentTools).not.toHaveBeenCalled()
    expect(createSkillTesterAgentTools).not.toHaveBeenCalled()
  })

  it('delegates to createSkillsAgentTools when key is "skills"', async () => {
    const handle = await createBuiltinAgentTools('skills')
    expect(handle).toBe(mockSkillsHandle)
    expect(createSkillsAgentTools).toHaveBeenCalledTimes(1)
    expect(createSkillTesterAgentTools).not.toHaveBeenCalled()
  })

  it('delegates to createSkillTesterAgentTools when key is "skill-tester"', async () => {
    const handle = await createBuiltinAgentTools('skill-tester')
    expect(handle).toBe(mockSkillTesterHandle)
    expect(handle.instructionsSuffix).toContain('Available installed skills')
    expect(createSkillTesterAgentTools).toHaveBeenCalledTimes(1)
    expect(createSkillsAgentTools).not.toHaveBeenCalled()
  })
})
