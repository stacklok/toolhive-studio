import { screen, waitFor } from '@testing-library/react'
import { beforeEach, it, expect, vi } from 'vitest'
import { createTestRouter } from '@/common/test/create-test-router'
import { McpOptimizerRoute } from '../mcp-optimizer'
import { renderRoute } from '@/common/test/render-route'
import { server, recordRequests } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import userEvent from '@testing-library/user-event'

const router = createTestRouter(McpOptimizerRoute, '/mcp-optimizer')

beforeEach(() => {
  vi.clearAllMocks()

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
          { name: 'server2', group: 'default' },
          { name: 'server3', group: 'production' },
        ],
      })
    )
  )
})

it('renders the MCP Optimizer page title', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('heading', { name: /mcp optimizer/i })
    ).toBeInTheDocument()
  })
})

it('renders the Advanced dropdown menu button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /advanced/i })
    ).toBeInTheDocument()
  })
})

it('renders the Manage Clients button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /manage clients/i })
    ).toBeInTheDocument()
  })
})

it('renders the warnings section', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('Experimental Feature')).toBeInTheDocument()
  })

  expect(screen.getByText('Unoptimized Access Detected')).toBeInTheDocument()
})

it('renders the section header and description', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('Select Groups to Optimize')).toBeInTheDocument()
  })

  expect(
    screen.getByText(
      /Choose which server groups should be included in optimization/i
    )
  ).toBeInTheDocument()
})

it('renders the group selector form with groups', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getAllByText('default').length).toBeGreaterThan(0)
  })

  expect(screen.getAllByText('production').length).toBeGreaterThan(0)
})

it('renders the Apply Changes button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /apply changes/i })
    ).toBeInTheDocument()
  })
})

it('displays server names for each group', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('server1, server2')).toBeInTheDocument()
  })

  expect(screen.getByText('server3')).toBeInTheDocument()
})

it('hides the mcp-optimizer group even when present in fixture data', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [
          { name: 'default' },
          { name: MCP_OPTIMIZER_GROUP_NAME },
          { name: 'production' },
        ],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads'), () =>
      HttpResponse.json({
        workloads: [
          { name: 'server1', group: 'default' },
          { name: 'meta-mcp', group: MCP_OPTIMIZER_GROUP_NAME },
          { name: 'server3', group: 'production' },
        ],
      })
    )
  )

  renderRoute(router)

  await waitFor(() => {
    expect(screen.getAllByText('default').length).toBeGreaterThan(0)
    expect(screen.getAllByText('production').length).toBeGreaterThan(0)
  })

  expect(screen.queryByText(MCP_OPTIMIZER_GROUP_NAME)).not.toBeInTheDocument()
})

it('preselects the default group when meta-mcp ALLOWED_GROUPS is set to default', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        return HttpResponse.json({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          env_vars: { ALLOWED_GROUPS: 'default' },
        })
      }
      return HttpResponse.json(null, { status: 404 })
    })
  )

  renderRoute(router)

  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).toBeChecked()

    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).not.toBeChecked()
  })
})

it('preselects the production group when meta-mcp ALLOWED_GROUPS is set to production', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        return HttpResponse.json({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          env_vars: { ALLOWED_GROUPS: 'production' },
        })
      }
      return HttpResponse.json(null, { status: 404 })
    })
  )

  renderRoute(router)

  await waitFor(() => {
    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).toBeChecked()

    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()
  })
})

it('shows no group selected when meta-mcp ALLOWED_GROUPS is not set', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        return HttpResponse.json({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          env_vars: {},
        })
      }
      return HttpResponse.json(null, { status: 404 })
    })
  )

  renderRoute(router)

  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()

    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).not.toBeChecked()
  })
})

it('shows no group selected when meta-mcp ALLOWED_GROUPS contains multiple groups', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        return HttpResponse.json({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          env_vars: { ALLOWED_GROUPS: 'default,production' },
        })
      }
      return HttpResponse.json(null, { status: 404 })
    })
  )

  renderRoute(router)

  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()

    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).not.toBeChecked()
  })
})

it('shows no group selected when meta-mcp workload does not exist', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        return HttpResponse.json(null, { status: 404 })
      }
      return HttpResponse.json(null, { status: 404 })
    })
  )

  renderRoute(router)

  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()

    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).not.toBeChecked()
  })
})

it('refetches the selected group when navigating back to the page', async () => {
  let callCount = 0

  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        callCount++
        const allowedGroups = callCount === 1 ? 'default' : 'production'
        return HttpResponse.json({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          env_vars: { ALLOWED_GROUPS: allowedGroups },
        })
      }
      return HttpResponse.json(null, { status: 404 })
    })
  )

  const { unmount } = renderRoute(router)

  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).toBeChecked()
  })

  expect(callCount).toBe(1)

  unmount()

  renderRoute(router)

  await waitFor(() => {
    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).toBeChecked()

    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()
  })

  expect(callCount).toBe(2)
})

it('Manage Clients button is correctly prefilled for the mcp-optimizer group', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [
          {
            name: MCP_OPTIMIZER_GROUP_NAME,
            registered_clients: ['vscode', 'cursor'],
          },
        ],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/clients'), () =>
      HttpResponse.json([
        { name: { name: 'vscode' }, groups: [MCP_OPTIMIZER_GROUP_NAME] },
        { name: { name: 'cursor' }, groups: [MCP_OPTIMIZER_GROUP_NAME] },
        { name: { name: 'claude-code' }, groups: [] },
      ])
    )
  )

  const user = userEvent.setup()
  renderRoute(router)

  await user.click(
    await screen.findByRole('button', { name: /manage clients/i })
  )

  await waitFor(() => {
    const vscodeSwitchContainer = screen
      .getByRole('switch', { name: 'vscode' })
      .closest('button')
    expect(vscodeSwitchContainer).toHaveAttribute('data-state', 'checked')

    const cursorSwitchContainer = screen
      .getByRole('switch', { name: /cursor/i })
      .closest('button')
    expect(cursorSwitchContainer).toHaveAttribute('data-state', 'checked')

    const claudeCodeSwitchContainer = screen
      .getByRole('switch', { name: /claude-code/i })
      .closest('button')
    expect(claudeCodeSwitchContainer).toHaveAttribute('data-state', 'unchecked')
  })
})

it('Manage Clients button sends API requests to the correct mcp-optimizer group', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: MCP_OPTIMIZER_GROUP_NAME, registered_clients: [] }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/clients'), () => HttpResponse.json([]))
  )

  const rec = recordRequests()

  const user = userEvent.setup()
  renderRoute(router)

  await user.click(
    await screen.findByRole('button', { name: /manage clients/i })
  )
  await user.click(await screen.findByRole('switch', { name: 'vscode' }))
  await user.click(await screen.findByRole('button', { name: /save/i }))

  await waitFor(() =>
    expect(
      rec.recordedRequests.filter(
        (r) =>
          r.pathname.startsWith('/api/v1beta/clients') &&
          (r.method === 'POST' || r.method === 'DELETE')
      )
    ).toHaveLength(1)
  )

  const snapshot = rec.recordedRequests
    .filter(
      (r) =>
        r.pathname.startsWith('/api/v1beta/clients') &&
        (r.method === 'POST' || r.method === 'DELETE')
    )
    .map(({ method, pathname, payload }) => ({
      method,
      path: pathname,
      body: payload,
    }))

  expect(snapshot).toEqual([
    {
      method: 'POST',
      path: '/api/v1beta/clients',
      body: { name: 'vscode', groups: [MCP_OPTIMIZER_GROUP_NAME] },
    },
  ])
})

it('Customize Meta-MCP configuration button refetches data after editing', async () => {
  let currentEnvVars = { FOO: 'initial_value' }

  server.use(
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        return HttpResponse.json({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          image: 'ghcr.io/toolhive/meta-mcp:latest',
          transport: 'stdio',
          env_vars: currentEnvVars,
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
      mswEndpoint(`/api/v1beta/workloads/${META_MCP_SERVER_NAME}/edit`),
      async ({ request }) => {
        const body = await request.json()
        currentEnvVars = body.env_vars || {}
        return HttpResponse.json({ success: true })
      }
    )
  )

  const user = userEvent.setup()

  renderRoute(router)

  await user.click(await screen.findByRole('button', { name: /advanced/i }))

  await user.click(
    await screen.findByRole('menuitem', {
      name: /customize meta-mcp configuration/i,
    })
  )

  await waitFor(() => {
    expect(screen.getByText(/edit meta-mcp mcp server/i)).toBeInTheDocument()
  })

  const fooInput = await screen.findByDisplayValue('initial_value')

  await user.clear(fooInput)
  await user.type(fooInput, 'updated_value')

  const updateButton = await screen.findByRole('button', {
    name: /update server/i,
  })
  await user.click(updateButton)

  await waitFor(() => {
    expect(
      screen.queryByText(/edit meta-mcp mcp server/i)
    ).not.toBeInTheDocument()
  })

  await user.click(await screen.findByRole('button', { name: /advanced/i }))

  await user.click(
    await screen.findByRole('menuitem', {
      name: /customize meta-mcp configuration/i,
    })
  )

  await waitFor(() => {
    expect(screen.getByText(/edit meta-mcp mcp server/i)).toBeInTheDocument()
  })

  await waitFor(() => {
    expect(screen.getByDisplayValue('updated_value')).toBeInTheDocument()
  })
})

it('radio button selection updates after editing ALLOWED_GROUPS via Customize Configuration', async () => {
  let currentAllowedGroups = 'default'
  let apiCallCount = 0

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
        apiCallCount++
        console.log(
          `[TEST] API call #${apiCallCount}: Returning ALLOWED_GROUPS="${currentAllowedGroups}"`
        )
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
      mswEndpoint(`/api/v1beta/workloads/${META_MCP_SERVER_NAME}/edit`),
      async ({ request }) => {
        const body = await request.json()
        currentAllowedGroups = body.env_vars?.ALLOWED_GROUPS || ''
        console.log(
          `[TEST] POST edit: Updated ALLOWED_GROUPS to "${currentAllowedGroups}"`
        )
        return HttpResponse.json({ success: true })
      }
    )
  )

  const user = userEvent.setup()
  renderRoute(router)

  console.log('[TEST] Step 1: Waiting for initial render...')
  // Verify 'default' is preselected initially
  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).toBeChecked()
  })
  console.log('[TEST] Step 1: ✓ Default radio is checked')

  // Open customize dialog and change ALLOWED_GROUPS to 'production'
  console.log('[TEST] Step 2: Opening Advanced menu...')
  await user.click(await screen.findByRole('button', { name: /advanced/i }))
  await user.click(
    await screen.findByRole('menuitem', {
      name: /customize meta-mcp configuration/i,
    })
  )

  // Wait for dialog to open
  console.log('[TEST] Step 3: Waiting for dialog to open...')
  await waitFor(() => {
    expect(screen.getByText(/edit meta-mcp mcp server/i)).toBeInTheDocument()
  })
  console.log('[TEST] Step 3: ✓ Dialog is open')

  // Find the ALLOWED_GROUPS value input by its name attribute
  console.log('[TEST] Step 4: Editing ALLOWED_GROUPS value...')
  const allowedGroupsInput = screen.getByRole('textbox', {
    name: /environment variable value 1/i,
  })
  expect(allowedGroupsInput).toHaveValue('default')
  await user.clear(allowedGroupsInput)
  await user.type(allowedGroupsInput, 'production')
  console.log('[TEST] Step 4: ✓ Typed "production"')

  console.log('[TEST] Step 5: Clicking Update server button...')
  await user.click(
    await screen.findByRole('button', { name: /update server/i })
  )

  // Wait for dialog to close
  console.log('[TEST] Step 6: Waiting for dialog to close...')
  await waitFor(() => {
    expect(
      screen.queryByText(/edit meta-mcp mcp server/i)
    ).not.toBeInTheDocument()
  })
  console.log('[TEST] Step 6: ✓ Dialog closed')

  console.log(
    `[TEST] Step 7: Checking if radio buttons updated (API was called ${apiCallCount} times so far)...`
  )

  // Verify 'production' is now selected
  await waitFor(
    () => {
      const productionRadio = screen.getByRole('radio', {
        name: /production/i,
      })
      const defaultRadio = screen.getByRole('radio', { name: /default/i })

      console.log(
        `[TEST] Step 7: Production checked: ${productionRadio.checked}, Default checked: ${defaultRadio.checked}`
      )

      expect(productionRadio).toBeChecked()
      expect(defaultRadio).not.toBeChecked()
    },
    { timeout: 5000 }
  )
  console.log('[TEST] Step 7: ✓ Radio buttons updated correctly!')
  console.log(`[TEST] Final: Total API calls: ${apiCallCount}`)
})
