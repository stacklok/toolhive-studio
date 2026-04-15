import { screen, waitFor } from '@testing-library/react'
import { expect, it, describe, beforeEach } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { GridCardsRegistrySkills } from '../grid-cards-registry-skills'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { mockedGetApiV1BetaDiscoveryClients } from '@mocks/fixtures/discovery_clients/get'

const testSkills: RegistrySkill[] = [
  {
    name: 'skill-alpha',
    namespace: 'io.github.alpha',
    description: 'First skill',
  },
  {
    name: 'skill-beta',
    namespace: 'io.github.beta',
    description: 'Second skill',
  },
  {
    name: 'skill-gamma',
    namespace: 'io.github.gamma',
    description: 'Third skill',
  },
]

function createGridRouter(skills: RegistrySkill[]) {
  return createTestRouter(
    () => <GridCardsRegistrySkills skills={skills} />,
    '/skills'
  )
}

beforeEach(() => {
  mockedGetApiV1BetaDiscoveryClients.activateScenario('empty')
})

describe('GridCardsRegistrySkills', () => {
  it('renders a card for each skill', async () => {
    renderRoute(createGridRouter(testSkills))

    await waitFor(() => {
      expect(screen.getByText('skill-alpha')).toBeInTheDocument()
      expect(screen.getByText('skill-beta')).toBeInTheDocument()
      expect(screen.getByText('skill-gamma')).toBeInTheDocument()
    })
  })

  it('shows empty message when skills array is empty', async () => {
    renderRoute(createGridRouter([]))

    await waitFor(() => {
      expect(
        screen.getByText('No skills found matching the current filter')
      ).toBeInTheDocument()
    })
  })

  it('renders descriptions for each skill', async () => {
    renderRoute(createGridRouter(testSkills))

    await waitFor(() => {
      expect(screen.getByText('First skill')).toBeInTheDocument()
      expect(screen.getByText('Second skill')).toBeInTheDocument()
      expect(screen.getByText('Third skill')).toBeInTheDocument()
    })
  })
})
