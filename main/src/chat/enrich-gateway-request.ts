import type { ChatRequest } from './types'
import { THV_LLM_PROVIDER_ID } from './constants'
import {
  ensureProxyStarted,
  resolveGatewayBaseURL,
  warmupGatewayAuth,
} from './providers/thv-llm'

export async function enrichGatewayChatRequest(
  request: ChatRequest
): Promise<ChatRequest> {
  if (request.provider !== THV_LLM_PROVIDER_ID) {
    return request
  }

  const gatewayRequest = request as Extract<
    ChatRequest,
    { provider: typeof THV_LLM_PROVIDER_ID }
  >

  const ensure = await ensureProxyStarted()
  if (ensure.error && !ensure.alreadyRunning && !ensure.started) {
    throw new Error(ensure.error)
  }

  const storedEndpoint = gatewayRequest.endpointURL?.trim()
  const baseURL =
    storedEndpoint && /^https?:\/\//i.test(storedEndpoint)
      ? storedEndpoint
      : await resolveGatewayBaseURL()
  if (!baseURL) {
    throw new Error(
      'Stacklok Gateway is not configured. Open Provider Settings and save your gateway connection.'
    )
  }

  const warmup = await warmupGatewayAuth()
  if (!warmup.ready) {
    throw new Error(
      warmup.error ??
        'Stacklok Gateway is not ready. Complete sign-in in your browser.'
    )
  }

  return {
    ...gatewayRequest,
    endpointURL: baseURL,
  }
}
