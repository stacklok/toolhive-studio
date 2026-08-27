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
  agent: AgentConfig | undefined,
  options?: { usesGatewayProvider?: boolean }
): EmptyStateCopy {
  if (agent?.id === BUILTIN_AGENT_IDS.skills) {
    return options?.usesGatewayProvider
      ? {
          heading: SKILLS_COPY.heading,
          subtext: 'Use Stacklok Gateway to design, build, and audit Skills',
        }
      : SKILLS_COPY
  }
  if (agent?.kind === 'custom') {
    return options?.usesGatewayProvider
      ? {
          heading: `Chat with ${agent.name}`,
          subtext: 'Use Stacklok Gateway to chat with your agent',
        }
      : {
          heading: `Chat with ${agent.name}`,
          subtext: 'Configure an AI service provider to chat with your agent',
        }
  }
  if (options?.usesGatewayProvider) {
    return {
      heading: TOOLHIVE_ASSISTANT_COPY.heading,
      subtext: 'Use Stacklok Gateway to test responses from your MCP servers',
    }
  }
  return TOOLHIVE_ASSISTANT_COPY
}
