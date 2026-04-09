import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi, describe, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { GridCardsBuilds } from '../grid-cards-builds'
import { mockedGetApiV1BetaSkillsBuilds } from '@/common/mocks/fixtures/skills_builds/get'

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

beforeEach(() => {
  mockedGetApiV1BetaSkillsBuilds.reset()
})

describe('GridCardsBuilds', () => {
  it('renders a card for each build', async () => {
    renderWithProviders(<GridCardsBuilds filter="" onInstall={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('my-skill')).toBeInTheDocument()
      expect(screen.getByText('another-skill')).toBeInTheDocument()
    })
  })

  it('shows empty state when there are no builds', async () => {
    mockedGetApiV1BetaSkillsBuilds.activateScenario('empty')

    renderWithProviders(<GridCardsBuilds filter="" onInstall={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('No local builds')).toBeInTheDocument()
    })
  })

  it('calls onInstall when the Install skill button in empty state is clicked', async () => {
    mockedGetApiV1BetaSkillsBuilds.activateScenario('empty')
    const user = userEvent.setup()
    const onInstall = vi.fn()

    renderWithProviders(<GridCardsBuilds filter="" onInstall={onInstall} />)

    await waitFor(() => {
      expect(screen.getByText('No local builds')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /install skill/i }))

    expect(onInstall).toHaveBeenCalledTimes(1)
  })

  it('shows filtered-empty message when filter matches nothing', async () => {
    renderWithProviders(
      <GridCardsBuilds filter="zzz-no-match-zzz" onInstall={vi.fn()} />
    )

    await waitFor(() => {
      expect(
        screen.getByText('No builds found matching the current filter')
      ).toBeInTheDocument()
    })
  })

  it('filters builds by name', async () => {
    renderWithProviders(
      <GridCardsBuilds filter="my-skill" onInstall={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('my-skill')).toBeInTheDocument()
      expect(screen.queryByText('another-skill')).not.toBeInTheDocument()
    })
  })
})
