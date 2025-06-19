import type { QueryClient } from '@tanstack/react-query'
import { orchestrateRunServer } from '../orchestrate-run-server'

test('happy path', async () => {
  const mockSaveSecret = vi.fn().mockResolvedValue({ key: 'TEST_SECRET' })
  const mockCreateWorkload = vi.fn().mockResolvedValue({})
  const mockGetIsServerReady = vi.fn().mockResolvedValue(true)
  const mockQueryClient = {
    fetchQuery: vi.fn().mockResolvedValue({ status: 'Running' }),
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient

  const server = {
    name: 'test-server',
    image: 'test-image',
    transport: 'tcp',
    args: ['--arg1', '--arg2'],
    target_port: 8080,
  }

  const formData = {
    serverName: 'Test Server',
    envVars: [{ name: 'TEST_ENV', value: 'test-value' }],
    secrets: [
      { name: 'TEST_SECRET', value: 'test-secret-value' },
      { name: '', value: '' }, // Should be ignored
    ],
  }

  await orchestrateRunServer({
    createWorkload: mockCreateWorkload,
    data: formData,
    getIsServerReady: mockGetIsServerReady,
    queryClient: mockQueryClient,
    saveSecret: mockSaveSecret,
    server,
  })

  expect(mockSaveSecret).toHaveBeenCalledTimes(1)
  expect(mockSaveSecret).toHaveBeenCalledWith(
    { body: { key: 'TEST_SECRET', value: 'test-secret-value' } },
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
      transport: 'tcp',
      env_vars: ['TEST_ENV=test-value'],
      secrets: [{ name: 'TEST_SECRET', target: 'TEST_SECRET' }],
      cmd_arguments: ['--arg1', '--arg2'],
      target_port: 8080,
    },
  })

  // Verify invalidateQueries called to refresh server lists
  expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: expect.anything(),
  })
}, 10_000)
