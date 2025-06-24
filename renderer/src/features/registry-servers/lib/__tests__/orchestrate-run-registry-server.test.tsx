import type { QueryClient } from '@tanstack/react-query'
import { orchestrateRunRegistryServer } from '../orchestrate-run-registry-server'
import type { FormSchemaRunFromRegistry } from '../get-form-schema-run-from-registry'
import type { RegistryServer } from '@/common/api/generated'

test('happy path', async () => {
  const mockSaveSecret = vi.fn().mockResolvedValue({ key: 'GITHUB_API_TOKEN' })
  const mockCreateWorkload = vi.fn().mockResolvedValue({})
  const mockGetIsServerReady = vi.fn().mockResolvedValue(true)
  const mockQueryClient = {
    fetchQuery: vi.fn().mockResolvedValue({ status: 'Running' }),
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient

  const server: RegistryServer = {
    name: 'test-server',
    image: 'test-image',
    transport: 'stdio',
  }

  const formData: FormSchemaRunFromRegistry = {
    serverName: 'Test Server',
    envVars: [{ name: 'TEST_ENV', value: 'foo-bar' }],
    secrets: [
      {
        name: 'GITHUB_API_TOKEN',
        value: { secret: 'foo-bar', isFromStore: false },
      },
      {
        name: 'GRAFANA_API_TOKEN',
        value: { secret: 'GRAFANA_API_TOKEN', isFromStore: true },
      },
      { name: '', value: { secret: '', isFromStore: false } }, // Should be ignored
    ],
  }

  await orchestrateRunRegistryServer({
    createWorkload: mockCreateWorkload,
    data: formData,
    getIsServerReady: mockGetIsServerReady,
    queryClient: mockQueryClient,
    saveSecret: mockSaveSecret,
    server,
  })

  expect(mockSaveSecret).toHaveBeenCalledTimes(1)
  expect(mockSaveSecret).toHaveBeenCalledWith(
    { body: { key: 'GITHUB_API_TOKEN', value: 'foo-bar' } },
    expect.objectContaining({
      onError: expect.any(Function),
      onSuccess: expect.any(Function),
    })
  )

  expect(mockCreateWorkload).toHaveBeenCalledTimes(1)
  expect(mockCreateWorkload).toHaveBeenCalledWith({
    body: {
      name: 'Test Server',
      image: 'test-image',
      transport: 'stdio',
      env_vars: ['TEST_ENV=foo-bar'],
      secrets: [
        { name: 'GITHUB_API_TOKEN', target: 'GITHUB_API_TOKEN' },
        {
          name: 'GRAFANA_API_TOKEN',
          target: 'GRAFANA_API_TOKEN',
        },
      ],
    },
  })

  // Verify invalidateQueries called to refresh server lists
  expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: expect.anything(),
  })
})
