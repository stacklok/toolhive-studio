import { QueryClient } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupSecretProvider } from '../setup-secret-provider'

vi.mock('@common/api/generated/sdk.gen', () => ({
  postApiV1BetaSecrets: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@common/api/generated/@tanstack/react-query.gen', () => ({
  getApiV1BetaSecretsDefaultOptions: vi.fn().mockReturnValue({
    queryKey: ['secrets-default'],
    queryFn: vi.fn(),
  }),
}))

const { postApiV1BetaSecrets } = await import('@common/api/generated/sdk.gen')
const { getApiV1BetaSecretsDefaultOptions } =
  await import('@common/api/generated/@tanstack/react-query.gen')

describe('setupSecretProvider', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('does nothing when provider is already encrypted', async () => {
    vi.mocked(getApiV1BetaSecretsDefaultOptions).mockReturnValue({
      queryKey: ['secrets-default'] as unknown as ReturnType<
        typeof getApiV1BetaSecretsDefaultOptions
      >['queryKey'],
      queryFn: vi.fn().mockResolvedValue({ provider_type: 'encrypted' }),
    })

    await setupSecretProvider(queryClient)

    expect(postApiV1BetaSecrets).not.toHaveBeenCalled()
  })

  it('creates encrypted provider when current type differs', async () => {
    vi.mocked(getApiV1BetaSecretsDefaultOptions).mockReturnValue({
      queryKey: ['secrets-default-2'] as unknown as ReturnType<
        typeof getApiV1BetaSecretsDefaultOptions
      >['queryKey'],
      queryFn: vi.fn().mockResolvedValue({ provider_type: 'plaintext' }),
    })

    await setupSecretProvider(queryClient)

    expect(postApiV1BetaSecrets).toHaveBeenCalledWith({
      body: { provider_type: 'encrypted' },
      throwOnError: true,
    })
  })

  it('creates encrypted provider on query error (fallback)', async () => {
    vi.mocked(getApiV1BetaSecretsDefaultOptions).mockReturnValue({
      queryKey: ['secrets-default-3'] as unknown as ReturnType<
        typeof getApiV1BetaSecretsDefaultOptions
      >['queryKey'],
      queryFn: vi.fn().mockRejectedValue(new Error('network error')),
    })

    await setupSecretProvider(queryClient)

    expect(postApiV1BetaSecrets).toHaveBeenCalledWith({
      body: { provider_type: 'encrypted' },
      throwOnError: true,
    })
  })
})
