import type { ToolSet } from 'ai'
import type { BuiltinToolsKey } from '../types'
import { createSkillsAgentTools, type SkillsAgentToolsHandle } from './skills'

export interface BuiltinToolsHandle {
  tools: ToolSet
  cleanup: () => Promise<void>
}

const EMPTY_HANDLE: BuiltinToolsHandle = {
  tools: {},
  cleanup: async () => {},
}

export function createBuiltinAgentTools(
  key: BuiltinToolsKey | null | undefined
): BuiltinToolsHandle {
  if (!key) return EMPTY_HANDLE

  switch (key) {
    case 'skills': {
      const handle: SkillsAgentToolsHandle = createSkillsAgentTools()
      return handle
    }
    default:
      return EMPTY_HANDLE
  }
}
