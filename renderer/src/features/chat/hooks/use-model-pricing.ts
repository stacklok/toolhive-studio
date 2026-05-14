import { useQuery } from '@tanstack/react-query'

const STALE_TIME = 24 * 60 * 60 * 1000

const LOCAL_PROVIDERS = new Set(['ollama', 'lmstudio'])

export interface ModelCost {
  input: number
  output: number
  cache_read?: number
  cache_write?: number
}

export type PricingMap = Record<string, Record<string, ModelCost>>

export function useModelPricing(providerId?: string, model?: string) {
  const enabled = Boolean(
    providerId && model && !LOCAL_PROVIDERS.has(providerId)
  )

  const { data: pricingMap } = useQuery<PricingMap>({
    queryKey: ['chat', 'modelPricing'],
    queryFn: () => window.electronAPI.chat.getModelPricing(),
    staleTime: STALE_TIME,
    gcTime: Infinity,
    enabled,
  })

  const pricing =
    enabled && pricingMap ? pricingMap[providerId!]?.[model!] : undefined

  return { pricing }
}
