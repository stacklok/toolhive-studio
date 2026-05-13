import { BUILTIN_AGENT_IDS } from '@common/types/agents'
import type { AgentConfig } from '@common/types/agents'

export interface EmptyStateCopy {
  heading: string
  subtext: string
}

const TOOLHIVE_ASSISTANT_COPY: EmptyStateCopy = {
  heading: 'Test & evaluate your MCP Servers',
  subtext:
    'Configure an AI service provider to use to test the responses from your MCP servers',
}

const SKILLS_COPY: EmptyStateCopy = {
  heading: 'Build & audit your Skills',
  subtext:
    'Configure an AI service provider to design, build, and audit Skills',
}

export function getEmptyStateCopy(
  agent: AgentConfig | undefined
): EmptyStateCopy {
  if (agent?.id === BUILTIN_AGENT_IDS.skills) {
    return SKILLS_COPY
  }
  if (agent?.kind === 'custom') {
    return {
      heading: `Chat with ${agent.name}`,
      subtext: 'Configure an AI service provider to chat with your agent',
    }
  }
  return TOOLHIVE_ASSISTANT_COPY
}
