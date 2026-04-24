export type AgentKind = 'builtin' | 'custom'

export type BuiltinToolsKey = 'skills' | 'planner'

export interface AgentConfig {
  id: string
  kind: AgentKind
  name: string
  description: string
  instructions: string
  defaultModel?: {
    provider: string
    model: string
  }
  builtinToolsKey?: BuiltinToolsKey | null
  createdAt: number
  updatedAt: number
}

export type CreateAgentInput = {
  name: string
  description: string
  instructions: string
  defaultModel?: { provider: string; model: string } | null
  builtinToolsKey?: BuiltinToolsKey | null
}

export type UpdateAgentInput = Partial<CreateAgentInput>

/**
 * User-facing metadata for built-in tool bundles that agents can bind.
 * Keep in sync with `createBuiltinAgentTools` in `./builtin-agent-tools`:
 * set `hasTools: false` for keys that are reserved slots with no tools yet,
 * so callers can filter them out of selection UI.
 */
export const BUILTIN_TOOL_BUNDLES: ReadonlyArray<{
  key: BuiltinToolsKey
  label: string
  description: string
  hasTools: boolean
}> = [
  {
    key: 'skills',
    label: 'Skills authoring',
    description:
      'Gives the agent tools to scaffold a skill directory (write_skill_files) and build it into an OCI artifact (build_skill).',
    hasTools: true,
  },
  {
    key: 'planner',
    label: 'Planner',
    description:
      'Reserved for planning-specific helpers. No tools are exposed yet.',
    hasTools: false,
  },
]

export const BUILTIN_AGENT_IDS = {
  toolhiveAssistant: 'builtin.toolhive-assistant',
  skills: 'builtin.skills',
  planner: 'builtin.planner',
} as const

export const DEFAULT_AGENT_ID = BUILTIN_AGENT_IDS.toolhiveAssistant
