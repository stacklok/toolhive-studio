import { render, waitFor } from '@testing-library/react'
import { screen } from '@testing-library/react'

import { it, vi } from 'vitest'
import { DialogFormRunMcpServerWithCommand } from '../dialog-form-run-mcp-command'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/common/components/ui/dialog'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const onSubmitMock = vi.fn()

window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

beforeEach(() => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
      return HttpResponse.json({ keys: [{ key: 'SECRET_FROM_STORE' }] })
    })
  )
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 0,
      staleTime: 0,
    },
  },
})

it('is able to run an MCP server while omitting optional fields', async () => {
  render(
    <QueryClientProvider client={queryClient}>
      <Dialog open>
        <DialogFormRunMcpServerWithCommand
          isOpen
          onOpenChange={() => {}}
          onSubmit={onSubmitMock}
        />
      </Dialog>
    </QueryClientProvider>
  )

  await userEvent.click(screen.getByRole('tab', { name: 'Docker image' }))

  await userEvent.type(screen.getByLabelText('Name'), 'foo-bar')

  await userEvent.click(screen.getByLabelText('Transport'))
  await userEvent.click(screen.getByRole('option', { name: 'stdio' }))

  await userEvent.type(
    screen.getByLabelText('Docker image'),
    'ghcr.io/github/github-mcp-server'
  )

  await userEvent.click(screen.getByRole('button', { name: 'Install server' }))
  expect(onSubmitMock).toHaveBeenCalledWith({
    name: 'foo-bar',
    transport: 'stdio',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: undefined,
    envVars: [],
    secrets: [],
    type: 'docker_image',
  })
})

it('is able to run an MCP server with docker', async () => {
  render(
    <QueryClientProvider client={queryClient}>
      <Dialog open>
        <DialogFormRunMcpServerWithCommand
          isOpen
          onOpenChange={() => {}}
          onSubmit={onSubmitMock}
        />
      </Dialog>
    </QueryClientProvider>
  )

  await userEvent.click(screen.getByRole('tab', { name: 'Docker image' }))

  await userEvent.type(screen.getByLabelText('Name'), 'foo-bar')

  await userEvent.click(screen.getByLabelText('Transport'))
  await userEvent.click(screen.getByRole('option', { name: 'stdio' }))

  await userEvent.type(
    screen.getByLabelText('Docker image'),
    'ghcr.io/github/github-mcp-server'
  )

  await userEvent.type(
    screen.getByLabelText('Command arguments'),
    '-y --oauth-setup'
  )

  // Inline secret
  await userEvent.click(screen.getByRole('button', { name: 'Add secret' }))
  await userEvent.type(screen.getByLabelText('Secret key'), 'MY_SECRET')
  await userEvent.type(screen.getByLabelText('Secret value'), 'foo-bar')

  // Secret from store
  await userEvent.click(screen.getByRole('button', { name: 'Add secret' }))
  await userEvent.type(
    screen.getAllByLabelText('Secret key')[1] as HTMLElement,
    'MY_SECRET_2'
  )
  await userEvent.click(
    screen.getAllByLabelText('Use a secret from the store')[1] as HTMLElement
  )
  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: 'Secrets store' })).toBeVisible()
  })
  await userEvent.click(
    screen.getByRole('option', { name: 'SECRET_FROM_STORE' })
  )

  // Environment variable
  await userEvent.click(
    screen.getByRole('button', { name: 'Add environment variable' })
  )
  await userEvent.type(
    screen.getByLabelText('Environment variable key'),
    'MY_ENV_VAR'
  )
  await userEvent.type(
    screen.getByLabelText('Environment variable value'),
    'foo-bar'
  )

  await userEvent.click(screen.getByRole('button', { name: 'Install server' }))

  const payload = onSubmitMock.mock.calls[0]?.[0]
  expect(payload).toBeDefined()
  expect(payload['name'], 'Should have name').toBe('foo-bar')
  expect(payload['transport'], 'Should have transport').toBe('stdio')
  expect(payload['image'], 'Should have image').toBe(
    'ghcr.io/github/github-mcp-server'
  )
  expect(payload['cmd_arguments'], 'Should have cmd_arguments').toEqual(
    '-y --oauth-setup'
  )
  expect(payload['envVars'], 'Should have env_vars').toEqual([
    {
      name: 'MY_ENV_VAR',
      value: 'foo-bar',
    },
  ])
  expect(payload['secrets'], 'Should have secrets').toEqual([
    {
      name: 'MY_SECRET',
      value: {
        secret: 'foo-bar',
        isFromStore: false,
      },
    },
    {
      name: 'MY_SECRET_2',
      value: {
        isFromStore: true,
        secret: 'SECRET_FROM_STORE',
      },
    },
  ])
})

it('is able to run an MCP server with npx', async () => {
  render(
    <QueryClientProvider client={queryClient}>
      <Dialog open>
        <DialogFormRunMcpServerWithCommand
          isOpen
          onOpenChange={() => {}}
          onSubmit={onSubmitMock}
        />
      </Dialog>
    </QueryClientProvider>
  )

  await userEvent.click(screen.getByRole('tab', { name: 'Package manager' }))

  await userEvent.type(screen.getByLabelText('Name'), 'foo-bar')

  await userEvent.click(screen.getByLabelText('Transport'))
  await userEvent.click(screen.getByRole('option', { name: 'stdio' }))

  await userEvent.click(screen.getByLabelText('Protocol'))
  await userEvent.click(screen.getByRole('option', { name: 'npx' }))

  await userEvent.type(
    screen.getByLabelText('Package name'),
    '@modelcontextprotocol/server-everything'
  )

  await userEvent.type(
    screen.getByLabelText('Command arguments'),
    '-y --oauth-setup'
  )

  // Inline secret
  await userEvent.click(screen.getByRole('button', { name: 'Add secret' }))
  await userEvent.type(screen.getByLabelText('Secret key'), 'MY_SECRET')
  await userEvent.type(screen.getByLabelText('Secret value'), 'foo-bar')

  // Secret from store
  await userEvent.click(screen.getByRole('button', { name: 'Add secret' }))
  await userEvent.type(
    screen.getAllByLabelText('Secret key')[1] as HTMLElement,
    'MY_SECRET_2'
  )
  await userEvent.click(
    screen.getAllByLabelText('Use a secret from the store')[1] as HTMLElement
  )
  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: 'Secrets store' })).toBeVisible()
  })
  await userEvent.click(
    screen.getByRole('option', { name: 'SECRET_FROM_STORE' })
  )

  // Environment variable
  await userEvent.click(
    screen.getByRole('button', { name: 'Add environment variable' })
  )
  await userEvent.type(
    screen.getByLabelText('Environment variable key'),
    'MY_ENV_VAR'
  )
  await userEvent.type(
    screen.getByLabelText('Environment variable value'),
    'foo-bar'
  )

  await userEvent.click(screen.getByRole('button', { name: 'Install server' }))

  const payload = onSubmitMock.mock.calls[0]?.[0]
  expect(payload).toBeDefined()
  expect(payload['name'], 'Should have name').toBe('foo-bar')
  expect(payload['transport'], 'Should have transport').toBe('stdio')
  expect(payload['protocol'], 'Should have protocol').toBe('npx')
  expect(payload['package_name'], 'Should have package name').toBe(
    '@modelcontextprotocol/server-everything'
  )
  expect(payload['cmd_arguments'], 'Should have cmd_arguments').toEqual(
    '-y --oauth-setup'
  )
  expect(payload['envVars'], 'Should have env_vars').toEqual([
    {
      name: 'MY_ENV_VAR',
      value: 'foo-bar',
    },
  ])
  expect(payload['secrets'], 'Should have secrets').toEqual([
    {
      name: 'MY_SECRET',
      value: {
        secret: 'foo-bar',
        isFromStore: false,
      },
    },
    {
      name: 'MY_SECRET_2',
      value: {
        isFromStore: true,
        secret: 'SECRET_FROM_STORE',
      },
    },
  ])
})

it('is able to run an MCP server with uvx', async () => {
  render(
    <QueryClientProvider client={queryClient}>
      <Dialog open>
        <DialogFormRunMcpServerWithCommand
          isOpen
          onOpenChange={() => {}}
          onSubmit={onSubmitMock}
        />
      </Dialog>
    </QueryClientProvider>
  )

  await userEvent.click(screen.getByRole('tab', { name: 'Package manager' }))

  await userEvent.type(screen.getByLabelText('Name'), 'foo-bar')

  await userEvent.click(screen.getByLabelText('Transport'))
  await userEvent.click(screen.getByRole('option', { name: 'stdio' }))

  await userEvent.click(screen.getByLabelText('Protocol'))
  await userEvent.click(screen.getByRole('option', { name: 'uvx' }))

  await userEvent.type(
    screen.getByLabelText('Package name'),
    'mcp-server-fetch'
  )

  await userEvent.type(
    screen.getByLabelText('Command arguments'),
    '-y --oauth-setup'
  )

  // Inline secret
  await userEvent.click(screen.getByRole('button', { name: 'Add secret' }))
  await userEvent.type(screen.getByLabelText('Secret key'), 'MY_SECRET')
  await userEvent.type(screen.getByLabelText('Secret value'), 'foo-bar')

  // Secret from store
  await userEvent.click(screen.getByRole('button', { name: 'Add secret' }))
  await userEvent.type(
    screen.getAllByLabelText('Secret key')[1] as HTMLElement,
    'MY_SECRET_2'
  )
  await userEvent.click(
    screen.getAllByLabelText('Use a secret from the store')[1] as HTMLElement
  )
  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: 'Secrets store' })).toBeVisible()
  })
  await userEvent.click(
    screen.getByRole('option', { name: 'SECRET_FROM_STORE' })
  )

  // Environment variable
  await userEvent.click(
    screen.getByRole('button', { name: 'Add environment variable' })
  )
  await userEvent.type(
    screen.getByLabelText('Environment variable key'),
    'MY_ENV_VAR'
  )
  await userEvent.type(
    screen.getByLabelText('Environment variable value'),
    'foo-bar'
  )

  await userEvent.click(screen.getByRole('button', { name: 'Install server' }))

  const payload = onSubmitMock.mock.calls[0]?.[0]
  expect(payload).toBeDefined()
  expect(payload['name'], 'Should have name').toBe('foo-bar')
  expect(payload['transport'], 'Should have transport').toBe('stdio')
  expect(payload['protocol'], 'Should have protocol').toBe('uvx')
  expect(payload['package_name'], 'Should have package name').toBe(
    'mcp-server-fetch'
  )
  expect(payload['cmd_arguments'], 'Should have cmd_arguments').toEqual(
    '-y --oauth-setup'
  )
  expect(payload['envVars'], 'Should have env_vars').toEqual([
    {
      name: 'MY_ENV_VAR',
      value: 'foo-bar',
    },
  ])
  expect(payload['secrets'], 'Should have secrets').toEqual([
    {
      name: 'MY_SECRET',
      value: {
        secret: 'foo-bar',
        isFromStore: false,
      },
    },
    {
      name: 'MY_SECRET_2',
      value: {
        isFromStore: true,
        secret: 'SECRET_FROM_STORE',
      },
    },
  ])
})

it('is able to run an MCP server with go', async () => {
  render(
    <QueryClientProvider client={queryClient}>
      <Dialog open>
        <DialogFormRunMcpServerWithCommand
          isOpen
          onOpenChange={() => {}}
          onSubmit={onSubmitMock}
        />
      </Dialog>
    </QueryClientProvider>
  )

  await userEvent.click(screen.getByRole('tab', { name: 'Package manager' }))

  await userEvent.type(screen.getByLabelText('Name'), 'foo-bar')

  await userEvent.click(screen.getByLabelText('Transport'))
  await userEvent.click(screen.getByRole('option', { name: 'stdio' }))

  await userEvent.click(screen.getByLabelText('Protocol'))
  await userEvent.click(screen.getByRole('option', { name: 'go' }))

  await userEvent.type(
    screen.getByLabelText('Package name'),
    'github.com/example/go-mcp-server'
  )

  await userEvent.type(
    screen.getByLabelText('Command arguments'),
    '-y --oauth-setup'
  )

  // Inline secret
  await userEvent.click(screen.getByRole('button', { name: 'Add secret' }))
  await userEvent.type(screen.getByLabelText('Secret key'), 'MY_SECRET')
  await userEvent.type(screen.getByLabelText('Secret value'), 'foo-bar')

  // Secret from store
  await userEvent.click(screen.getByRole('button', { name: 'Add secret' }))
  await userEvent.type(
    screen.getAllByLabelText('Secret key')[1] as HTMLElement,
    'MY_SECRET_2'
  )
  await userEvent.click(
    screen.getAllByLabelText('Use a secret from the store')[1] as HTMLElement
  )
  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: 'Secrets store' })).toBeVisible()
  })
  await userEvent.click(
    screen.getByRole('option', { name: 'SECRET_FROM_STORE' })
  )

  // Environment variable
  await userEvent.click(
    screen.getByRole('button', { name: 'Add environment variable' })
  )
  await userEvent.type(
    screen.getByLabelText('Environment variable key'),
    'MY_ENV_VAR'
  )
  await userEvent.type(
    screen.getByLabelText('Environment variable value'),
    'foo-bar'
  )

  await userEvent.click(screen.getByRole('button', { name: 'Install server' }))

  const payload = onSubmitMock.mock.calls[0]?.[0]
  expect(payload).toBeDefined()
  expect(payload['name'], 'Should have name').toBe('foo-bar')
  expect(payload['transport'], 'Should have transport').toBe('stdio')
  expect(payload['protocol'], 'Should have protocol').toBe('go')
  expect(payload['package_name'], 'Should have package name').toBe(
    'github.com/example/go-mcp-server'
  )
  expect(payload['cmd_arguments'], 'Should have cmd_arguments').toEqual(
    '-y --oauth-setup'
  )
  expect(payload['envVars'], 'Should have env_vars').toEqual([
    {
      name: 'MY_ENV_VAR',
      value: 'foo-bar',
    },
  ])
  expect(payload['secrets'], 'Should have secrets').toEqual([
    {
      name: 'MY_SECRET',
      value: {
        secret: 'foo-bar',
        isFromStore: false,
      },
    },
    {
      name: 'MY_SECRET_2',
      value: {
        isFromStore: true,
        secret: 'SECRET_FROM_STORE',
      },
    },
  ])
})
