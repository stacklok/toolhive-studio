export const THV_LLM_PROVIDER_ID = 'thv-llm' as const

export type GatewayProviderId = typeof THV_LLM_PROVIDER_ID

export function isGatewayProvider(
  providerId: string
): providerId is GatewayProviderId {
  return providerId === THV_LLM_PROVIDER_ID
}
