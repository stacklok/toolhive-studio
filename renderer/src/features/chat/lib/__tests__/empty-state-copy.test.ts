import { describe, expect, it } from 'vitest'
import { getEmptyStateCopy } from '../empty-state-copy'
import { BUILTIN_AGENT_IDS } from '@common/types/agents'

describe('getEmptyStateCopy', () => {
  it('uses gateway-specific copy when Stacklok Gateway is active', () => {
    const copy = getEmptyStateCopy(undefined, { usesGatewayProvider: true })
    expect(copy.subtext).toContain('Stacklok Gateway')
    expect(copy.subtext).not.toContain('Configure an AI service provider')
  })

  it('keeps default provider prompt when no gateway is selected', () => {
    const copy = getEmptyStateCopy(undefined, { usesGatewayProvider: false })
    expect(copy.subtext).toContain('Configure an AI service provider')
  })

  it('uses gateway copy for skills agent', () => {
    const copy = getEmptyStateCopy(
      {
        id: BUILTIN_AGENT_IDS.skills,
        kind: 'builtin',
        name: 'Skills',
        description: '',
        instructions: '',
        builtinToolsKey: 'skills',
        createdAt: 0,
        updatedAt: 0,
      },
      { usesGatewayProvider: true }
    )
    expect(copy.subtext).toContain('Stacklok Gateway')
  })
})
