import { screen, waitFor } from '@testing-library/react'
import { it, expect } from 'vitest'
import { createTestRouter } from '@/common/test/create-test-router'
import { McpOptimizerRoute } from '../mcp-optimizer'
import { renderRoute } from '@/common/test/render-route'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import userEvent from '@testing-library/user-event'

const router = createTestRouter(McpOptimizerRoute, '/mcp-optimizer')

it('radio button selection updates after editing ALLOWED_GROUPS via Customize Configuration', async () => {
  let currentAllowedGroups = 'default'

  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads'), () =>
      HttpResponse.json({
        workloads: [
          { name: 'server1', group: 'default' },
          { name: 'server2', group: 'production' },
        ],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        return HttpResponse.json({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          image: 'ghcr.io/toolhive/meta-mcp:latest',
          transport: 'stdio',
          env_vars: { ALLOWED_GROUPS: currentAllowedGroups },
          cmd_arguments: [],
          secrets: [],
          volumes: [],
          network_isolation: false,
        })
      }
      return HttpResponse.json(null, { status: 404 })
    }),
    http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () =>
      HttpResponse.json({ keys: [] })
    ),
    http.post(
      mswEndpoint('/api/v1beta/workloads/:name/edit'),
      async ({ request }) => {
        const body = (await request.json()) as {
          env_vars?: { ALLOWED_GROUPS?: string }
        }
        currentAllowedGroups = body?.env_vars?.ALLOWED_GROUPS || ''
        return HttpResponse.json({ success: true })
      }
    )
  )

  const user = userEvent.setup()
  renderRoute(router)

  // Verify 'default' is preselected initially
  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).toBeChecked()
  })

  // Open customize dialog and change ALLOWED_GROUPS to 'production'
  await user.click(await screen.findByRole('button', { name: /advanced/i }))
  await user.click(
    await screen.findByRole('menuitem', {
      name: /customize meta-mcp configuration/i,
    })
  )

  // Wait for dialog to open
  await waitFor(() => {
    expect(screen.getByText(/edit meta-mcp mcp server/i)).toBeInTheDocument()
  })

  // Find the ALLOWED_GROUPS value input and change it
  const allowedGroupsInput = screen.getByRole('textbox', {
    name: /environment variable value 1/i,
  })
  expect(allowedGroupsInput).toHaveValue('default')
  await user.clear(allowedGroupsInput)
  await user.type(allowedGroupsInput, 'production')

  // Click update button
  await user.click(
    await screen.findByRole('button', { name: /update server/i })
  )

  // Wait for dialog to close
  await waitFor(() => {
    expect(
      screen.queryByText(/edit meta-mcp mcp server/i)
    ).not.toBeInTheDocument()
  })

  // Verify 'production' is now selected
  await waitFor(
    () => {
      const productionRadio = screen.getByRole('radio', {
        name: /production/i,
      }) as HTMLInputElement
      const defaultRadio = screen.getByRole('radio', {
        name: /default/i,
      }) as HTMLInputElement

      expect(productionRadio).toBeChecked()
      expect(defaultRadio).not.toBeChecked()
    },
    { timeout: 5000 }
  )
})
