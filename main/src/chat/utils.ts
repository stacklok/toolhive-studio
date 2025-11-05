import type { ChatRequest } from './types'

export function isLocalServerRequest(
  request: ChatRequest
): request is Extract<ChatRequest, { provider: 'ollama' | 'lmstudio' }> {
  return (
    (request.provider === 'ollama' || request.provider === 'lmstudio') &&
    'endpointURL' in request
  )
}

export function hasApiKey(
  request: ChatRequest
): request is Extract<ChatRequest, { apiKey: string }> {
  return 'apiKey' in request
}
