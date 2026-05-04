import type { ToolSet } from 'ai'
import type { BuiltinToolsKey } from '../types'
import { createSkillsAgentTools, type SkillsAgentToolsHandle } from './skills'

interface BuiltinToolsHandle {
  tools: ToolSet
  cleanup: () => Promise<void>
  /**
   * Optional text to append to the agent's instructions for this stream.
   * Built-in bundles use this for things like the auto-injected list of
   * available skills (Vercel guide progressive-disclosure pattern).
   */
  instructionsSuffix?: string
}

const EMPTY_HANDLE: BuiltinToolsHandle = {
  tools: {},
  cleanup: async () => {},
}

export async function createBuiltinAgentTools(
  key: BuiltinToolsKey | null | undefined
): Promise<BuiltinToolsHandle> {
  if (!key) return EMPTY_HANDLE

  switch (key) {
    case 'skills': {
      const handle: SkillsAgentToolsHandle = await createSkillsAgentTools()
      return handle
    }
    default:
      return EMPTY_HANDLE
  }
}
