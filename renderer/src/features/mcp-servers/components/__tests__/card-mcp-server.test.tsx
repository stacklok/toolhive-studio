import { screen, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { CardMcpServer } from '../card-mcp-server'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import userEvent from '@testing-library/user-event'

const router = createTestRouter(() => (
  <CardMcpServer
    name="test-server"
    status="running"
    statusContext={undefined}
    url=""
    transport="http"
    onEdit={() => {}}
  />
))

it('navigates to logs page when logs menu item is clicked', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('test-server')).toBeVisible()
  })

  const moreOptionsButton = screen.getByRole('button', {
    name: /more options/i,
  })

  await userEvent.click(moreOptionsButton)

  const logsMenuItem = screen.getByRole('menuitem', { name: /logs/i })
  await userEvent.click(logsMenuItem)

  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/logs/test-server')
  })
})
