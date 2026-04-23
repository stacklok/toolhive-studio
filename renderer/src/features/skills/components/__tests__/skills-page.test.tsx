import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { createFileRouteTestRouter } from '@/common/test/create-file-route-test-router'
import { Route as SkillsRouteImport } from '@/routes/skills'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { PermissionsProvider } from '@/common/contexts/permissions/permissions-provider'
import { SkillsPage } from '../skills-page'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { mockedGetApiV1BetaDiscoveryClients } from '@mocks/fixtures/discovery_clients/get'
import { mockedGetApiV1BetaSkills } from '@mocks/fixtures/skills/get'
import { mockedGetRegistryByRegistryNameV01XDevToolhiveSkills } from '@mocks/fixtures/registry_registryName_v0_1_x_dev_toolhive_skills/get'
import { HttpResponse } from 'msw'

function skillsFor(
  page: number,
  limit: number,
  total: number
): RegistrySkill[] {
  const firstIndex = (page - 1) * limit
  const lastIndex = Math.min(total, firstIndex + limit)
  const size = Math.max(0, lastIndex - firstIndex)
  return Array.from({ length: size }, (_, i) => {
    const n = firstIndex + i + 1
    return {
      name: `skill-${n}`,
      namespace: 'io.github.test',
      description: `Skill number ${n}`,
    }
  })
}

function setupRegistryMock(total: number) {
  mockedGetRegistryByRegistryNameV01XDevToolhiveSkills.overrideHandler(
    (_data, info) => {
      const url = new URL(info.request.url)
      const page = Number(url.searchParams.get('page') ?? 1)
      const limit = Number(url.searchParams.get('limit') ?? 12)
      const search = url.searchParams.get('q') ?? ''
      const effectiveTotal = search ? Math.min(total, 25) : total
      return HttpResponse.json({
        skills: skillsFor(page, limit, effectiveTotal),
        metadata: { page, limit, total: effectiveTotal },
      })
    }
  )
}

function renderSkillsPage() {
  const router = createTestRouter(SkillsPage, '/skills')
  router.history.replace('/skills?tab=registry')
  return renderRoute(router)
}

beforeEach(() => {
  mockedGetApiV1BetaDiscoveryClients.activateScenario('empty')
  mockedGetApiV1BetaSkills.activateScenario('empty')
})

describe('SkillsPage registry pagination', () => {
  it('renders the first page with default limit of 12', async () => {
    setupRegistryMock(100)

    renderSkillsPage()

    await waitFor(() => {
      expect(screen.getByText('skill-1')).toBeVisible()
      expect(screen.getByText('skill-12')).toBeVisible()
    })

    expect(screen.queryByText('skill-13')).not.toBeInTheDocument()
    expect(screen.getByText('Page 1')).toBeVisible()
    expect(screen.getByText('Showing 1-12 of 100 skills')).toBeVisible()
  })

  it('advances to the next page when Next is clicked', async () => {
    const user = userEvent.setup()
    setupRegistryMock(100)

    renderSkillsPage()

    await waitFor(() => {
      expect(screen.getByText('skill-1')).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: /go to next page/i }))

    await waitFor(() => {
      expect(screen.getByText('skill-13')).toBeVisible()
      expect(screen.getByText('skill-24')).toBeVisible()
    })
    expect(screen.getByText('Page 2')).toBeVisible()
    expect(screen.queryByText('skill-1')).not.toBeInTheDocument()
  })

  it('resets to page 1 when the page size changes', async () => {
    const user = userEvent.setup()
    setupRegistryMock(200)

    renderSkillsPage()

    await waitFor(() => {
      expect(screen.getByText('skill-1')).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: /go to next page/i }))
    await waitFor(() => {
      expect(screen.getByText('Page 2')).toBeVisible()
    })

    await user.click(screen.getByRole('combobox', { name: /items per page/i }))
    await user.click(screen.getByRole('option', { name: '50' }))

    await waitFor(() => {
      expect(screen.getByText('Showing 1-50 of 200 skills')).toBeVisible()
    })
    expect(screen.getByText('Page 1')).toBeVisible()
    expect(screen.getByText('skill-1')).toBeVisible()
    expect(screen.getByText('skill-50')).toBeVisible()
  })

  it('resets to page 1 when the search query changes', async () => {
    const user = userEvent.setup()
    setupRegistryMock(100)

    renderSkillsPage()

    await waitFor(() => {
      expect(screen.getByText('skill-1')).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: /go to next page/i }))
    await waitFor(() => {
      expect(screen.getByText('Page 2')).toBeVisible()
    })

    const search = screen.getByPlaceholderText('Search...')
    await user.type(search, 'foo')

    await waitFor(() => {
      expect(screen.getByText('Showing 1-12 of 25 skills')).toBeVisible()
    })
    expect(screen.getByText('Page 1')).toBeVisible()
  })

  it('hides the pagination bar when the total fits in the smallest page size', async () => {
    setupRegistryMock(10)

    renderSkillsPage()

    await waitFor(() => {
      expect(screen.getByText('skill-1')).toBeVisible()
    })

    expect(
      screen.queryByRole('button', { name: /go to next page/i })
    ).not.toBeInTheDocument()
  })

  it('disables Next when on the last page of a larger result set', async () => {
    const user = userEvent.setup()
    setupRegistryMock(20)

    renderSkillsPage()

    await waitFor(() => {
      expect(screen.getByText('Showing 1-12 of 20 skills')).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: /go to next page/i }))

    await waitFor(() => {
      expect(screen.getByText('Showing 13-20 of 20 skills')).toBeVisible()
    })
    expect(screen.getByText('Page 2')).toBeVisible()
    expect(
      screen.getByRole('button', { name: /go to next page/i })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /go to previous page/i })
    ).toBeEnabled()
  })

  it('reads page and limit from the URL so back-navigation restores them', async () => {
    setupRegistryMock(200)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const router = createFileRouteTestRouter(
      SkillsRouteImport,
      '/skills',
      '/skills?tab=registry&page=3&limit=24',
      queryClient
    )

    render(
      <PermissionsProvider>
        <PromptProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </PromptProvider>
      </PermissionsProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Showing 49-72 of 200 skills')).toBeVisible()
    })
    expect(screen.getByText('Page 3')).toBeVisible()
    expect(screen.getByText('skill-49')).toBeVisible()
    expect(screen.getByText('skill-72')).toBeVisible()
  })

  it('preserves the URL page under React StrictMode double-effect invocation', async () => {
    // Regression guard: a boolean "first-run" ref guard on the search-reset
    // effect broke under StrictMode dev, silently resetting page=1 on mount.
    setupRegistryMock(200)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const router = createFileRouteTestRouter(
      SkillsRouteImport,
      '/skills',
      '/skills?tab=registry&page=3&limit=24',
      queryClient
    )

    render(
      <StrictMode>
        <PermissionsProvider>
          <PromptProvider>
            <QueryClientProvider client={queryClient}>
              <RouterProvider router={router} />
            </QueryClientProvider>
          </PromptProvider>
        </PermissionsProvider>
      </StrictMode>
    )

    await waitFor(() => {
      expect(screen.getByText('Page 3')).toBeVisible()
    })
    expect(router.state.location.search).toMatchObject({
      tab: 'registry',
      page: 3,
      limit: 24,
    })
  })

  it('updates the URL when the page changes so navigating back works', async () => {
    const user = userEvent.setup()
    setupRegistryMock(100)
    const router = createTestRouter(SkillsPage, '/skills')
    router.history.replace('/skills?tab=registry')

    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('skill-1')).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: /go to next page/i }))
    await user.click(screen.getByRole('button', { name: /go to next page/i }))

    await waitFor(() => {
      expect(screen.getByText('Page 3')).toBeVisible()
    })

    const { search } = router.state.location
    expect(search).toMatchObject({ tab: 'registry', page: 3 })
  })

  it('returns to the first page via the First button', async () => {
    const user = userEvent.setup()
    setupRegistryMock(100)

    renderSkillsPage()

    await waitFor(() => {
      expect(screen.getByText('skill-1')).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: /go to next page/i }))
    await user.click(screen.getByRole('button', { name: /go to next page/i }))

    await waitFor(() => {
      expect(screen.getByText('Page 3')).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: /go to first page/i }))

    await waitFor(() => {
      expect(screen.getByText('Page 1')).toBeVisible()
    })

    // sanity: there is no "skill-25" on page 1
    const grid = screen.getByRole('tabpanel', { name: /registry/i })
    expect(within(grid).queryByText('skill-25')).not.toBeInTheDocument()
  })
})
