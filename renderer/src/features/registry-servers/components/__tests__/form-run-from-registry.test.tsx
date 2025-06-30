import type {
  RegistryEnvVar,
  RegistryImageMetadata,
} from '@/common/api/generated'
import { render, screen, waitFor } from '@testing-library/react'
import { it, expect } from 'vitest'
import { FormRunFromRegistry } from '../form-run-from-registry'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 0,
      staleTime: 0,
    },
  },
})

const REGISTRY_SERVER: RegistryImageMetadata = {
  name: 'foo-bar-server',
  image: 'ghcr.io/foo/bar:latest',
  description: 'foo bar',
  transport: 'stdio',
  permissions: {},
  tools: ['tool-1'],
  env_vars: [
    {
      name: 'ENV_VAR',
      description: 'foo bar',
      required: false,
    },

    {
      name: 'SECRET',
      description: 'foo bar',
      secret: true,
    },
  ],
  args: [],
  metadata: {},
  repository_url: 'https://github.com/foo/bar',
  tags: ['foo', 'bar'],
}

const ENV_VARS_OPTIONAL = [
  {
    name: 'ENV_VAR',
    description: 'foo bar',
    required: false,
  },

  {
    name: 'SECRET',
    description: 'foo bar',
    secret: true,
    required: false,
  },
] as const satisfies RegistryEnvVar[]

const ENV_VARS_REQUIRED = [
  {
    name: 'ENV_VAR',
    description: 'foo bar',
    required: true,
  },

  {
    name: 'SECRET',
    description: 'foo bar',
    secret: true,
    required: true,
  },
] as const satisfies RegistryEnvVar[]

it('allows form submission with "inline" secret', async () => {
  const server = REGISTRY_SERVER
  server.env_vars = ENV_VARS_OPTIONAL

  const onSubmit = vi.fn()
  const onOpenChange = vi.fn()

  render(
    <QueryClientProvider client={queryClient}>
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={onOpenChange}
        server={server}
        onSubmit={onSubmit}
      />
    </QueryClientProvider>
  )

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByText(`Configure ${REGISTRY_SERVER.name}`)).toBeVisible()
  })

  await userEvent.type(
    screen.getByLabelText('Server Name', { selector: 'input' }),
    'my-awesome-server',
    {
      initialSelectionStart: 0,
      initialSelectionEnd: REGISTRY_SERVER.name?.length,
    }
  )

  await userEvent.type(
    screen.getByLabelText('Secrets', { selector: 'input' }),
    'my-awesome-secret'
  )
  await userEvent.type(
    screen.getByLabelText('Environment variables', { selector: 'input' }),
    'my-awesome-env-var'
  )

  await userEvent.click(screen.getByRole('button', { name: 'Install Server' }))

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      envVars: [
        {
          name: 'ENV_VAR',
          value: 'my-awesome-env-var',
        },
      ],
      secrets: [
        {
          name: 'SECRET',
          value: {
            isFromStore: false,
            secret: 'my-awesome-secret',
          },
        },
      ],
      serverName: 'my-awesome-server',
    })
  })
  expect(onOpenChange).toHaveBeenCalledWith(false)
})

it('allows form submission with secret from store', async () => {
  const mockServer = REGISTRY_SERVER
  mockServer.env_vars = ENV_VARS_OPTIONAL

  const onSubmit = vi.fn()
  const onOpenChange = vi.fn()

  server.use(
    http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
      return HttpResponse.json({
        keys: [
          {
            key: 'MY_AWESOME_SECRET',
          },
        ],
      })
    })
  )

  render(
    <QueryClientProvider client={queryClient}>
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={onOpenChange}
        server={mockServer}
        onSubmit={onSubmit}
      />
    </QueryClientProvider>
  )

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByText(`Configure ${REGISTRY_SERVER.name}`)).toBeVisible()
  })

  await userEvent.type(
    screen.getByLabelText('Server Name', { selector: 'input' }),
    'my-awesome-server',
    {
      initialSelectionStart: 0,
      initialSelectionEnd: REGISTRY_SERVER.name?.length,
    }
  )

  await userEvent.click(screen.getByLabelText('Use a secret from the store'))
  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: 'Secrets store' })).toBeVisible()
  })
  await userEvent.click(
    screen.getByRole('option', { name: 'MY_AWESOME_SECRET' })
  )

  await userEvent.type(
    screen.getByLabelText('Environment variables', { selector: 'input' }),
    'my-awesome-env-var'
  )

  await userEvent.click(screen.getByRole('button', { name: 'Install Server' }))

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      envVars: [
        {
          name: 'ENV_VAR',
          value: 'my-awesome-env-var',
        },
      ],
      secrets: [
        {
          name: 'SECRET',
          value: {
            isFromStore: true,
            secret: 'MY_AWESOME_SECRET',
          },
        },
      ],
      serverName: 'my-awesome-server',
    })
  })
  expect(onOpenChange).toHaveBeenCalledWith(false)
})

it('allows form submission without optional vars', async () => {
  const server = REGISTRY_SERVER
  server.env_vars = ENV_VARS_OPTIONAL

  const onSubmit = vi.fn()
  const onOpenChange = vi.fn()

  render(
    <QueryClientProvider client={queryClient}>
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={onOpenChange}
        server={server}
        onSubmit={onSubmit}
      />
    </QueryClientProvider>
  )

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByText(`Configure ${REGISTRY_SERVER.name}`)).toBeVisible()
  })

  await userEvent.type(
    screen.getByLabelText('Server Name', { selector: 'input' }),
    'my-awesome-server',
    {
      initialSelectionStart: 0,
      initialSelectionEnd: REGISTRY_SERVER.name?.length,
    }
  )

  await userEvent.click(screen.getByRole('button', { name: 'Install Server' }))

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      // NOTE: This looks broken, but is the desired behavior, these are
      // filtered in the `useRunFromRegistry` hook
      envVars: [
        {
          name: 'ENV_VAR',
          value: '',
        },
      ],
      secrets: [
        {
          name: 'SECRET',
          value: {
            isFromStore: false,
            secret: '',
          },
        },
      ],
      serverName: 'my-awesome-server',
    })
  })
  expect(onOpenChange).toHaveBeenCalledWith(false)
})

it('allows form submission with populated required vars', async () => {
  const server = REGISTRY_SERVER
  server.env_vars = ENV_VARS_REQUIRED

  const onSubmit = vi.fn()
  const onOpenChange = vi.fn()

  render(
    <QueryClientProvider client={queryClient}>
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={onOpenChange}
        server={server}
        onSubmit={onSubmit}
      />
    </QueryClientProvider>
  )

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByText(`Configure ${REGISTRY_SERVER.name}`)).toBeVisible()
  })

  await userEvent.type(
    screen.getByLabelText('Server Name', { selector: 'input' }),
    'my-awesome-server',
    {
      initialSelectionStart: 0,
      initialSelectionEnd: REGISTRY_SERVER.name?.length,
    }
  )

  await userEvent.type(
    screen.getByLabelText('Secrets', { selector: 'input' }),
    'my-awesome-secret'
  )
  await userEvent.type(
    screen.getByLabelText('Environment variables', { selector: 'input' }),
    'my-awesome-env-var'
  )

  await userEvent.click(screen.getByRole('button', { name: 'Install Server' }))

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      envVars: [
        {
          name: 'ENV_VAR',
          value: 'my-awesome-env-var',
        },
      ],
      secrets: [
        {
          name: 'SECRET',
          value: {
            isFromStore: false,
            secret: 'my-awesome-secret',
          },
        },
      ],
      serverName: 'my-awesome-server',
    })
  })
  expect(onOpenChange).toHaveBeenCalledWith(false)
})

it('renders validation errors when required variables missing', async () => {
  const server = REGISTRY_SERVER
  server.env_vars = ENV_VARS_REQUIRED

  const onSubmit = vi.fn()
  const onOpenChange = vi.fn()

  render(
    <QueryClientProvider client={queryClient}>
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={onOpenChange}
        server={server}
        onSubmit={onSubmit}
      />
    </QueryClientProvider>
  )

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByText(`Configure ${REGISTRY_SERVER.name}`)).toBeVisible()
  })

  await userEvent.type(
    screen.getByLabelText('Server Name', { selector: 'input' }),
    'my-awesome-server',
    {
      initialSelectionStart: 0,
      initialSelectionEnd: REGISTRY_SERVER.name?.length,
    }
  )

  await userEvent.click(screen.getByRole('button', { name: 'Install Server' }))

  await waitFor(() => {
    expect(onSubmit).not.toHaveBeenCalled()
  })

  await waitFor(() => {
    expect(
      screen.getByLabelText('Secrets', { selector: 'input' })
    ).toHaveAttribute('aria-invalid', 'true')

    expect(
      screen.getByLabelText('Environment variables', { selector: 'input' })
    ).toHaveAttribute('aria-invalid', 'true')
  })
})
