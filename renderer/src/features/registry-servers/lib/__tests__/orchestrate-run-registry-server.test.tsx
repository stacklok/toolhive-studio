import { it, expect, vi } from 'vitest'
import type { QueryClient } from '@tanstack/react-query'

import { getApiV1BetaWorkloadsQueryKey } from '@/common/api/generated/@tanstack/react-query.gen'
import { toast } from 'sonner'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'
import type { FormSchemaRunFromRegistry } from '../get-form-schema-run-from-registry'
import { orchestrateRunRegistryServer } from '../orchestrate-run-registry-server'
import type { RegistryImageMetadata } from '@/common/api/generated'

vi.mock('sonner', async () => {
  const original = await vi.importActual<typeof import('sonner')>('sonner')
  return {
    ...original,
    toast: {
      loading: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      dismiss: vi.fn(),
    },
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

it('should submit without any optional fields', async () => {
  const mockSaveSecret = vi.fn()
  const mockCreateWorkload = vi.fn()
  const mockGetIsServerReady = vi.fn().mockResolvedValue(true)
  const mockQueryClient = {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient

  const SERVER: RegistryImageMetadata = {
    name: 'test-server',
    image: 'test-image',
    transport: 'stdio',
  }

  const DATA: FormSchemaRunFromRegistry = {
    serverName: 'Test Server',
    envVars: [],
    secrets: [],
  }

  await orchestrateRunRegistryServer({
    createWorkload: mockCreateWorkload,
    data: DATA,
    getIsServerReady: mockGetIsServerReady,
    queryClient: mockQueryClient,
    saveSecret: mockSaveSecret,
    server: SERVER,
  })

  expect(mockSaveSecret).toHaveBeenCalledTimes(0)
  expect(mockGetIsServerReady).toHaveBeenCalledTimes(1)
  expect(mockCreateWorkload).toHaveBeenCalledTimes(1)
  expect(mockCreateWorkload).toHaveBeenCalledWith({
    body: {
      name: 'Test Server',
      image: 'test-image',
      transport: 'stdio',
      secrets: [],
      cmd_arguments: [],
      env_vars: [],
    },
  })
  expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
  })

  expect(toast.success).toHaveBeenCalledWith(
    '"Test Server" started successfully.',
    expect.any(Object)
  )
})

it('should handle new secrets properly', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
      return HttpResponse.json({ keys: [] })
    })
  )

  const mockSaveSecret = vi.fn()
  const mockCreateWorkload = vi.fn()
  const mockGetIsServerReady = vi.fn().mockResolvedValue(true)
  const mockQueryClient = {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient

  const SERVER: RegistryImageMetadata = {
    name: 'test-server',
    image: 'test-image',
    transport: 'stdio',
  }

  const DATA = {
    serverName: 'Test Server',
    envVars: [],
    secrets: [
      {
        name: 'GITHUB_API_TOKEN',
        value: { secret: 'foo-bar', isFromStore: false },
      },
      { name: '', value: { secret: '', isFromStore: false } }, // Should be ignored
    ],
  } as const satisfies FormSchemaRunFromRegistry

  mockSaveSecret.mockResolvedValueOnce({ key: DATA.secrets[0].name })

  await orchestrateRunRegistryServer({
    createWorkload: mockCreateWorkload,
    data: DATA,
    getIsServerReady: mockGetIsServerReady,
    queryClient: mockQueryClient,
    saveSecret: mockSaveSecret,
    server: SERVER,
  })

  expect(mockSaveSecret).toHaveBeenCalledWith(
    { body: { key: 'GITHUB_API_TOKEN', value: 'foo-bar' } },
    expect.any(Object)
  )

  expect(mockGetIsServerReady).toHaveBeenCalledTimes(1)
  expect(mockCreateWorkload).toHaveBeenCalledTimes(1)
  expect(mockCreateWorkload).toHaveBeenCalledWith({
    body: {
      name: 'Test Server',
      image: 'test-image',
      transport: 'stdio',
      secrets: [
        {
          name: 'GITHUB_API_TOKEN',
          target: 'GITHUB_API_TOKEN',
        },
      ],
      cmd_arguments: [],
      env_vars: [],
    },
  })
  expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
  })

  expect(toast.success).toHaveBeenCalledWith(
    '"Test Server" started successfully.',
    expect.any(Object)
  )
})

it('should handle existing secrets from the store properly', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
      return HttpResponse.json({ keys: [{ key: 'GITHUB_API_TOKEN' }] })
    })
  )

  const mockSaveSecret = vi.fn()
  const mockCreateWorkload = vi.fn()
  const mockGetIsServerReady = vi.fn().mockResolvedValue(true)
  const mockQueryClient = {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient

  const SERVER: RegistryImageMetadata = {
    name: 'test-server',
    image: 'test-image',
    transport: 'stdio',
  }

  const DATA = {
    serverName: 'Test Server',
    envVars: [],
    secrets: [
      {
        name: 'GITHUB_API_TOKEN',
        value: { secret: 'GITHUB_API_TOKEN', isFromStore: true },
      },
      { name: '', value: { secret: '', isFromStore: false } }, // Should be ignored
    ],
  } as const satisfies FormSchemaRunFromRegistry

  await orchestrateRunRegistryServer({
    createWorkload: mockCreateWorkload,
    data: DATA,
    getIsServerReady: mockGetIsServerReady,
    queryClient: mockQueryClient,
    saveSecret: mockSaveSecret,
    server: SERVER,
  })

  expect(mockSaveSecret).not.toHaveBeenCalled()

  expect(mockGetIsServerReady).toHaveBeenCalledTimes(1)
  expect(mockCreateWorkload).toHaveBeenCalledTimes(1)
  expect(mockCreateWorkload).toHaveBeenCalledWith({
    body: {
      name: 'Test Server',
      image: 'test-image',
      transport: 'stdio',
      secrets: [
        {
          name: 'GITHUB_API_TOKEN',
          target: 'GITHUB_API_TOKEN',
        },
      ],
      cmd_arguments: [],
      env_vars: [],
    },
  })
  expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
  })

  expect(toast.success).toHaveBeenCalledWith(
    '"Test Server" started successfully.',
    expect.any(Object)
  )
})

it('should handle naming collisions with secrets from the store', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
      return HttpResponse.json({ keys: [{ key: 'GITHUB_API_TOKEN' }] })
    })
  )

  const mockSaveSecret = vi.fn()
  const mockCreateWorkload = vi.fn()
  const mockGetIsServerReady = vi.fn().mockResolvedValue(true)
  const mockQueryClient = {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient

  const SERVER: RegistryImageMetadata = {
    name: 'test-server',
    image: 'test-image',
    transport: 'stdio',
  }

  const DATA = {
    serverName: 'Test Server',
    envVars: [],
    secrets: [
      {
        name: 'GITHUB_API_TOKEN',
        value: { secret: 'foo-bar', isFromStore: false },
      },
      { name: '', value: { secret: '', isFromStore: false } }, // Should be ignored
    ],
  } as const satisfies FormSchemaRunFromRegistry

  mockSaveSecret.mockResolvedValueOnce({ key: 'GITHUB_API_TOKEN_2' })

  await orchestrateRunRegistryServer({
    createWorkload: mockCreateWorkload,
    data: DATA,
    getIsServerReady: mockGetIsServerReady,
    queryClient: mockQueryClient,
    saveSecret: mockSaveSecret,
    server: SERVER,
  })

  expect(mockSaveSecret).toHaveBeenCalledWith(
    { body: { key: 'GITHUB_API_TOKEN_2', value: 'foo-bar' } },
    expect.any(Object)
  )

  expect(mockGetIsServerReady).toHaveBeenCalledTimes(1)
  expect(mockCreateWorkload).toHaveBeenCalledTimes(1)
  expect(mockCreateWorkload).toHaveBeenCalledWith({
    body: {
      name: 'Test Server',
      image: 'test-image',
      transport: 'stdio',
      secrets: [
        {
          name: 'GITHUB_API_TOKEN_2',
          target: 'GITHUB_API_TOKEN',
        },
      ],
      cmd_arguments: [],
      env_vars: [],
    },
  })
  expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
  })

  expect(toast.success).toHaveBeenCalledWith(
    '"Test Server" started successfully.',
    expect.any(Object)
  )
})

it('should handle both new and existing secrets', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
      return HttpResponse.json({ keys: [{ key: 'ATLASSIAN_API_TOKEN' }] })
    })
  )

  const mockSaveSecret = vi.fn()
  const mockCreateWorkload = vi.fn()
  const mockGetIsServerReady = vi.fn().mockResolvedValue(true)
  const mockQueryClient = {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient

  const SERVER: RegistryImageMetadata = {
    name: 'test-server',
    image: 'test-image',
    transport: 'stdio',
  }

  const DATA = {
    serverName: 'Test Server',
    envVars: [],
    secrets: [
      {
        name: 'GITHUB_API_TOKEN',
        value: { secret: 'foo-bar', isFromStore: false },
      },
      {
        name: 'ATLASSIAN_API_TOKEN',
        value: { secret: 'ATLASSIAN_API_TOKEN', isFromStore: true },
      },
      { name: '', value: { secret: '', isFromStore: false } }, // Should be ignored
    ],
  } as const satisfies FormSchemaRunFromRegistry

  mockSaveSecret.mockResolvedValueOnce({ key: DATA.secrets[0].name })

  await orchestrateRunRegistryServer({
    createWorkload: mockCreateWorkload,
    data: DATA,
    getIsServerReady: mockGetIsServerReady,
    queryClient: mockQueryClient,
    saveSecret: mockSaveSecret,
    server: SERVER,
  })

  expect(mockSaveSecret).toHaveBeenCalledWith(
    { body: { key: 'GITHUB_API_TOKEN', value: 'foo-bar' } },
    expect.any(Object)
  )

  expect(mockGetIsServerReady).toHaveBeenCalledTimes(1)
  expect(mockCreateWorkload).toHaveBeenCalledTimes(1)
  expect(mockCreateWorkload).toHaveBeenCalledWith({
    body: {
      name: 'Test Server',
      image: 'test-image',
      transport: 'stdio',
      secrets: [
        {
          name: 'GITHUB_API_TOKEN',
          target: 'GITHUB_API_TOKEN',
        },
        {
          name: 'ATLASSIAN_API_TOKEN',
          target: 'ATLASSIAN_API_TOKEN',
        },
      ],
      cmd_arguments: [],
      env_vars: [],
    },
  })
  expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
  })

  expect(toast.success).toHaveBeenCalledWith(
    '"Test Server" started successfully.',
    expect.any(Object)
  )
})

it('should handle error when saving a secret fails', async () => {
  const mockError = new Error('Failed to save secret')
  const mockSaveSecret = vi.fn().mockRejectedValue(mockError)
  const mockCreateWorkload = vi.fn()
  const mockGetIsServerReady = vi.fn()
  const mockQueryClient = {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient

  const SERVER: RegistryImageMetadata = {
    name: 'test-server',
    image: 'test-image',
    transport: 'stdio',
  }

  const DATA = {
    serverName: 'Test Server',
    envVars: [],
    secrets: [
      {
        name: 'GITHUB_API_TOKEN',
        value: { secret: 'foo-bar', isFromStore: false },
      },
      { name: '', value: { secret: '', isFromStore: false } }, // Should be ignored
    ],
  } as const satisfies FormSchemaRunFromRegistry

  await orchestrateRunRegistryServer({
    createWorkload: mockCreateWorkload,
    data: DATA,
    getIsServerReady: mockGetIsServerReady,
    queryClient: mockQueryClient,
    saveSecret: mockSaveSecret,
    server: SERVER,
  })

  // createWorkload should not be called if saving secrets fails
  expect(mockCreateWorkload).not.toHaveBeenCalled()
  expect(mockGetIsServerReady).not.toHaveBeenCalled()

  // Error toast should be shown
  expect(toast.error).toHaveBeenCalledWith(
    'An error occurred while starting the server.\nFailed to save secret',
    expect.any(Object)
  )
})

it('should handle environment variables properly', async () => {
  const mockSaveSecret = vi.fn()
  const mockCreateWorkload = vi.fn()
  const mockGetIsServerReady = vi.fn().mockResolvedValue(true)
  const mockQueryClient = {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient

  const SERVER: RegistryImageMetadata = {
    name: 'test-server',
    image: 'test-image',
    transport: 'stdio',
  }

  const DATA = {
    serverName: 'Test Server',
    envVars: [
      { name: 'DEBUG', value: 'true' },
      { name: 'PORT', value: '8080' },
    ],
    secrets: [
      {
        name: 'GITHUB_API_TOKEN',
        value: { secret: 'foo-bar', isFromStore: true },
      },
      { name: '', value: { secret: '', isFromStore: false } }, // Should be ignored
    ],
  } as const satisfies FormSchemaRunFromRegistry

  await orchestrateRunRegistryServer({
    createWorkload: mockCreateWorkload,
    data: DATA,
    getIsServerReady: mockGetIsServerReady,
    queryClient: mockQueryClient,
    saveSecret: mockSaveSecret,
    server: SERVER,
  })

  expect(mockCreateWorkload).toHaveBeenCalledWith({
    body: expect.objectContaining({
      env_vars: ['DEBUG=true', 'PORT=8080'],
    }),
  })
})

it('should handle command arguments properly', async () => {
  const mockSaveSecret = vi.fn()
  const mockCreateWorkload = vi.fn()
  const mockGetIsServerReady = vi.fn().mockResolvedValue(true)
  const mockQueryClient = {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient

  const SERVER: RegistryImageMetadata = {
    name: 'test-server',
    image: 'test-image',
    transport: 'stdio',
  }

  const DATA = {
    serverName: 'Test Server',
    envVars: [
      { name: 'DEBUG', value: 'true' },
      { name: 'PORT', value: '8080' },
    ],
    secrets: [
      {
        name: 'GITHUB_API_TOKEN',
        value: { secret: 'foo-bar', isFromStore: true },
      },
      { name: '', value: { secret: '', isFromStore: false } }, // Should be ignored
    ],
    cmd_arguments: '--debug --port 8080',
  } as const satisfies FormSchemaRunFromRegistry

  await orchestrateRunRegistryServer({
    createWorkload: mockCreateWorkload,
    data: DATA,
    getIsServerReady: mockGetIsServerReady,
    queryClient: mockQueryClient,
    saveSecret: mockSaveSecret,
    server: SERVER,
  })

  expect(mockCreateWorkload).toHaveBeenCalledWith({
    body: expect.objectContaining({
      cmd_arguments: ['--debug', '--port', '8080'],
    }),
  })
})

it('should show warning toast when server is not ready', async () => {
  const mockSaveSecret = vi.fn()
  const mockCreateWorkload = vi.fn()
  const mockGetIsServerReady = vi.fn().mockResolvedValue(false)
  const mockQueryClient = {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient

  const SERVER: RegistryImageMetadata = {
    name: 'test-server',
    image: 'test-image',
    transport: 'stdio',
  }

  const DATA: FormSchemaRunFromRegistry = {
    serverName: 'Test Server',
    envVars: [],
    secrets: [],
  }

  await orchestrateRunRegistryServer({
    createWorkload: mockCreateWorkload,
    data: DATA,
    getIsServerReady: mockGetIsServerReady,
    queryClient: mockQueryClient,
    saveSecret: mockSaveSecret,
    server: SERVER,
  })

  expect(toast.loading).toHaveBeenCalledWith(
    'Starting "Test Server"...',
    expect.any(Object)
  )
  expect(toast.warning).toHaveBeenCalledWith(
    'Server "Test Server" was created but may still be starting up. Check the servers list to monitor its status.',
    expect.any(Object)
  )
  expect(toast.success).not.toHaveBeenCalled()
})
