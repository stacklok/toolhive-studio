import { Data } from 'effect'

/** Base shape for expected chat domain failures. */
export type ChatDomainError =
  | ChatUnavailableError
  | StorageError
  | ThreadNotFoundError
  | ThreadAlreadyExistsError
  | ProviderError
  | McpDiscoveryError
  | McpServerUnavailableError
  | StreamConflictError
  | ValidationError

export const CHAT_UNAVAILABLE_USER_MESSAGE =
  'Chat is temporarily unavailable. Please restart the app and try again.'

export class ChatUnavailableError extends Data.TaggedError(
  'ChatUnavailableError'
)<{
  readonly reason: string
  readonly userMessage: string
}> {}

export class StorageError extends Data.TaggedError('StorageError')<{
  readonly operation: string
  readonly cause?: unknown
  readonly userMessage: string
}> {}

export class ThreadNotFoundError extends Data.TaggedError(
  'ThreadNotFoundError'
)<{
  readonly threadId: string
  readonly userMessage: string
}> {}

export class ThreadAlreadyExistsError extends Data.TaggedError(
  'ThreadAlreadyExistsError'
)<{
  readonly threadId: string
  readonly userMessage: string
}> {}

export class ProviderError extends Data.TaggedError('ProviderError')<{
  readonly providerId: string
  readonly cause?: unknown
  readonly userMessage: string
}> {}

export class McpDiscoveryError extends Data.TaggedError('McpDiscoveryError')<{
  readonly cause?: unknown
  readonly userMessage: string
  readonly serverFailures: ReadonlyArray<{
    readonly serverName: string
    readonly reason: string
  }>
}> {}

export class McpServerUnavailableError extends Data.TaggedError(
  'McpServerUnavailableError'
)<{
  readonly userMessage: string
}> {}

export class StreamConflictError extends Data.TaggedError(
  'StreamConflictError'
)<{
  readonly chatId: string
  readonly userMessage: string
}> {}

export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly field?: string
  readonly userMessage: string
}> {}

export function toUserFacingProviderMessage(error: unknown): string {
  const message = getErrorMessage(error)
  if (/overloaded/i.test(message)) {
    return 'The AI service is currently overloaded. Please try again in a few moments.'
  }
  if (/rate limit/i.test(message)) {
    return 'Rate limit exceeded. Please wait a moment before sending another message.'
  }
  if (/insufficient_quota|quota/i.test(message)) {
    return 'API quota exceeded. Please check your API key billing status.'
  }
  if (/invalid_api_key|authentication/i.test(message)) {
    return 'Invalid API key. Please check your API key configuration.'
  }
  return message || 'An error occurred.'
}

export function getDomainUserMessage(error: ChatDomainError): string {
  return error.userMessage
}

function getErrorMessage(error: unknown): string {
  // Domain errors carry text in `userMessage`; Data.TaggedError only populates
  // `.message` when `message` is passed at construction.
  if (error && typeof error === 'object' && 'userMessage' in error) {
    const userMessage = (error as { userMessage: unknown }).userMessage
    if (typeof userMessage === 'string' && userMessage.length > 0) {
      return userMessage
    }
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string') return message
  }
  return ''
}
