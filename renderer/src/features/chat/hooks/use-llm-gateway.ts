import { useQuery } from '@tanstack/react-query'

export function useLlmGatewayStatus() {
  return useQuery({
    queryKey: ['chat', 'llmGateway', 'status'],
    queryFn: () => window.electronAPI.chat.llmGateway.getStatus(),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  })
}

export async function ensureGatewayReady(): Promise<{
  ready: boolean
  error?: string
}> {
  try {
    await window.electronAPI.chat.llmGateway.ensureStarted()
    const warmup = await window.electronAPI.chat.llmGateway.warmupAuth()
    if (!warmup.ready) {
      return {
        ready: false,
        error:
          warmup.error ??
          'Complete sign-in in your browser to use Stacklok Gateway.',
      }
    }
    return { ready: true }
  } catch (error) {
    return {
      ready: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to connect to Stacklok Gateway.',
    }
  }
}
