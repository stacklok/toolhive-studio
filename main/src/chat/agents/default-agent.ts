import type { AgentConfig } from '@common/types/agents'
import { DEFAULT_AGENT_ID } from '@common/types/agents'
import { APP_ASSISTANT_NAME } from '@common/app-info'

/** In-memory fallback when the default builtin agent cannot be loaded. */
export function createDefaultAgentConfig(now = Date.now()): AgentConfig {
  return {
    id: DEFAULT_AGENT_ID,
    kind: 'builtin',
    name: APP_ASSISTANT_NAME,
    description: '',
    instructions: 'You are a helpful assistant.',
    builtinToolsKey: null,
    createdAt: now,
    updatedAt: now,
  }
}
