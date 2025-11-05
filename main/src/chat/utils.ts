import type { LanguageModel } from 'ai'
import type { ChatRequest, ChatProvider } from './types'
import { LOCAL_PROVIDER_IDS, type LocalProviderId } from './constants'

export function isLocalServerRequest(
  request: ChatRequest
): request is Extract<ChatRequest, { provider: LocalProviderId }> {
  return (
    LOCAL_PROVIDER_IDS.includes(request.provider as LocalProviderId) &&
    'endpointURL' in request
  )
}

export function hasApiKey(
  request: ChatRequest
): request is Extract<ChatRequest, { apiKey: string }> {
  return 'apiKey' in request
}

export function createModelFromRequest(
  provider: ChatProvider,
  request: ChatRequest
): LanguageModel {
  if (isLocalServerRequest(request)) {
    return provider.createModel(request.model, request.endpointURL)
  }
  if (hasApiKey(request)) {
    return provider.createModel(request.model, request.apiKey)
  }
  throw new Error('Invalid request: missing credentials')
}
