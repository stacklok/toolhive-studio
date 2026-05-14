import { useQuery } from '@tanstack/react-query'

const STALE_TIME = 24 * 60 * 60 * 1000

export interface ModelCost {
  input: number
  output: number
  cache_read?: number
  cache_write?: number
}

export type PricingMap = Record<string, Record<string, ModelCost>>

export function useModelPricing() {
  const { data: pricingMap } = useQuery<PricingMap>({
    queryKey: ['chat', 'modelPricing'],
    queryFn: () => window.electronAPI.chat.getModelPricing(),
    staleTime: STALE_TIME,
    gcTime: Infinity,
  })

  const getPricing = (
    providerId: string | undefined,
    model: string | undefined
  ): ModelCost | undefined => {
    if (!providerId || !model || !pricingMap) return undefined
    return pricingMap[providerId]?.[model]
  }

  return { getPricing }
}
