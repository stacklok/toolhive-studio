import type { LanguageModel } from 'ai'
import type { ChatRequest, ChatProvider } from './types'
import { ENDPOINT_PROVIDER_IDS, type EndpointProviderId } from './constants'

function isEndpointProviderRequest(
  request: ChatRequest
): request is Extract<ChatRequest, { endpointURL: string }> {
  return (
    ENDPOINT_PROVIDER_IDS.includes(request.provider as EndpointProviderId) &&
    'endpointURL' in request
  )
}

function hasApiKey(
  request: ChatRequest
): request is Extract<ChatRequest, { apiKey: string }> {
  return 'apiKey' in request
}

export function createModelFromRequest(
  provider: ChatProvider,
  request: ChatRequest
): LanguageModel {
  if (isEndpointProviderRequest(request)) {
    return provider.createModel(request.model, request.endpointURL)
  }
  if (hasApiKey(request)) {
    return provider.createModel(request.model, request.apiKey)
  }
  throw new Error('Invalid request: missing credentials')
}
