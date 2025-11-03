import { screen, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RegistryGroupDetail } from '@/routes/(registry)/registry-group_.$name'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import userEvent from '@testing-library/user-event'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useParams: () => ({ name: 'dev-toolkit' }),
  }
})

function WrapperComponent() {
  return (
    <>
      <RegistryGroupDetail />
    </>
  )
}

describe('Registry Group Detail Route', () => {
  it('displays group name as a page heading', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })
  })

  it('displays group description under the heading', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('Essential tools for development')).toBeVisible()
    })
  })

  it('shows a table of servers with Server and Description columns', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    // Ensure page is rendered
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    // Verify table structure
    const table = screen.getByRole('table')
    expect(table).toBeVisible()
    expect(screen.getByRole('columnheader', { name: /server/i })).toBeVisible()
    expect(
      screen.getByRole('columnheader', { name: /description/i })
    ).toBeVisible()

    // Verify at least one server row exists and contains expected data
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(1)
    const atlassianRow = rows.find((row) =>
      within(row).queryByText(/atlassian/i)
    )
    expect(atlassianRow).toBeTruthy()
    expect(within(atlassianRow!).getByText(/atlassian/i)).toBeVisible()
    expect(
      within(atlassianRow!).getByText(/connect to atlassian/i)
    ).toBeVisible()
  })

  it('matches column headers snapshot', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    const table = screen.getByRole('table')
    const headerCells = within(table).getAllByRole('columnheader')
    const headers = headerCells.map((th) => th.textContent?.trim() || '')
    expect(headers).toMatchInlineSnapshot(`
      [
        "Server",
        "Description",
      ]
    `)
  })

  it('matches server rows snapshot', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    const table = screen.getByRole('table')
    const allRows = within(table).getAllByRole('row')
    const bodyRows = allRows.slice(1) // skip header row
    const data = bodyRows.map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent?.trim() || '')
    )

    expect(data).toMatchInlineSnapshot(`
      [
        [
          "atlassian",
          "Connect to Atlassian products like Confluence, Jira Cloud and Server/Data deployments.",
        ],
      ]
    `)
  })

  it('has a back button that navigates to registry', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText(/dev-toolkit/i)).toBeVisible()
    })

    const backButton = screen.getByRole('button', { name: /back/i })
    expect(backButton).toBeVisible()
    expect(backButton.closest('a')).toHaveAttribute('href', '/registry')

    await userEvent.click(backButton)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/registry')
    })
  })
})
