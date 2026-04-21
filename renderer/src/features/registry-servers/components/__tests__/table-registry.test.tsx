import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Router,
} from '@tanstack/react-router'
import { renderRoute } from '@/common/test/render-route'
import type { createTestRouter } from '@/common/test/create-test-router'
import type { RegistryItem } from '../../types'
import { TableRegistry } from '../table-registry'

const localServer: RegistryItem = {
  type: 'server',
  name: 'postgres',
  title: 'Postgres',
  description: 'Manage Postgres databases',
  image: 'ghcr.io/org/postgres:1',
  status: 'active',
  metadata: { stars: 1234 },
  repository_url: 'https://github.com/org/postgres',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

const remoteServer: RegistryItem = {
  type: 'server',
  name: 'remote-api',
  title: 'Remote API',
  description: 'A remote MCP server',
  url: 'https://example.com/mcp',
  status: 'deprecated',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

const group: RegistryItem = {
  type: 'group',
  name: 'ai-tools',
  description: 'Group of AI tools',
  servers: { a: {}, b: {} },
  remote_servers: { c: {} },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

function makeRouter(element: React.ReactElement) {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  })
  const tableRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/registry',
    component: () => element,
  })
  const serverDetail = createRoute({
    getParentRoute: () => rootRoute,
    path: '/registry/$name',
    component: () => <div data-testid="server-detail" />,
  })
  const groupDetail = createRoute({
    getParentRoute: () => rootRoute,
    path: '/registry-group/$name',
    component: () => <div data-testid="group-detail" />,
  })
  return new Router({
    routeTree: rootRoute.addChildren([tableRoute, serverDetail, groupDetail]),
    history: createMemoryHistory({ initialEntries: ['/registry'] }),
    defaultNotFoundComponent: () => null,
  }) as unknown as ReturnType<typeof createTestRouter>
}

describe('TableRegistry', () => {
  it('renders headers and rows for servers and groups', async () => {
    const router = makeRouter(
      <TableRegistry items={[localServer, remoteServer, group]} />
    )
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('Postgres')).toBeVisible()
    })

    expect(
      screen.getByRole('columnheader', { name: /name/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /about/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /type/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /stars/i })
    ).toBeInTheDocument()

    expect(screen.getByText('Postgres')).toBeVisible()
    expect(screen.getByText('Remote API')).toBeVisible()
    expect(screen.getByText('ai-tools')).toBeVisible()
  })

  it('shows stars, type icon, and GitHub link for servers', async () => {
    const router = makeRouter(
      <TableRegistry items={[localServer, remoteServer]} />
    )
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeVisible()
    })
    expect(screen.getByLabelText(/local mcp server/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/remote mcp server/i)).toBeInTheDocument()

    const github = screen.getByRole('link', {
      name: /open repository on github/i,
    })
    expect(github).toHaveAttribute('href', 'https://github.com/org/postgres')
  })

  it('shows the Group badge and server count for groups', async () => {
    const router = makeRouter(<TableRegistry items={[group]} />)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('Group')).toBeVisible()
    })
    expect(screen.getByText('3 servers')).toBeVisible()
  })

  it('navigates to /registry/$name when a server row is clicked', async () => {
    const user = userEvent.setup()
    const router = makeRouter(<TableRegistry items={[localServer]} />)
    renderRoute(router)

    const row = await screen.findByRole('button', { name: 'Postgres' })
    await user.click(row)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/registry/postgres')
    })
  })

  it('navigates to /registry-group/$name when a group row is clicked', async () => {
    const user = userEvent.setup()
    const router = makeRouter(<TableRegistry items={[group]} />)
    renderRoute(router)

    const row = await screen.findByRole('button', { name: 'ai-tools' })
    await user.click(row)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/registry-group/ai-tools')
    })
  })

  it('activates a row with Enter or Space keys', async () => {
    const user = userEvent.setup()
    const router = makeRouter(<TableRegistry items={[localServer]} />)
    renderRoute(router)

    const row = await screen.findByRole('button', { name: 'Postgres' })
    row.focus()
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/registry/postgres')
    })
  })

  it('does not navigate when clicking the GitHub link', async () => {
    const user = userEvent.setup()
    const router = makeRouter(<TableRegistry items={[localServer]} />)
    renderRoute(router)

    const github = await screen.findByRole('link', {
      name: /open repository on github/i,
    })
    await user.click(github)

    expect(router.state.location.pathname).toBe('/registry')
  })

  it('renders the promo row at index 6 when showPromo is set', async () => {
    const items: RegistryItem[] = Array.from({ length: 8 }, (_, i) => ({
      ...localServer,
      name: `server-${i}`,
      title: `Server ${i}`,
    }))
    const router = makeRouter(<TableRegistry items={items} showPromo />)
    renderRoute(router)

    const promo = await screen.findByTestId('registry-promo-row')
    expect(promo).toBeInTheDocument()
    expect(screen.getByText(/build a custom registry/i)).toBeVisible()

    const body = promo.closest('tbody')
    expect(body).not.toBeNull()
    const rows = body!.querySelectorAll('tr')
    expect(rows[6]).toBe(promo)
  })

  it('does not render the promo row when showPromo is not set', async () => {
    const items: RegistryItem[] = Array.from({ length: 8 }, (_, i) => ({
      ...localServer,
      name: `server-${i}`,
      title: `Server ${i}`,
    }))
    const router = makeRouter(<TableRegistry items={items} />)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('Server 0')).toBeVisible()
    })

    expect(screen.queryByTestId('registry-promo-row')).toBeNull()
  })

  it('shows empty state when items is empty', async () => {
    const router = makeRouter(<TableRegistry items={[]} />)
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByText(
          /no servers or groups found matching the current filter/i
        )
      ).toBeVisible()
    })
  })
})
