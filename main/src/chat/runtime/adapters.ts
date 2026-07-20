import { Cause, Effect, Exit } from 'effect'
import {
  CHAT_UNAVAILABLE_USER_MESSAGE,
  ChatUnavailableError,
  type ChatDomainError,
  getDomainUserMessage,
} from './errors'
import type { ChatServices } from './managed-runtime'
import { getManagedRuntime } from './runtime-ref'

type ResultSuccess<T> = { success: true } & T
export type ResultFailure = { success: false; error: string }
export type OperationResult<
  T extends Record<string, unknown> = Record<string, unknown>,
> = ResultSuccess<T> | ResultFailure

const DOMAIN_ERROR_TAGS = new Set<ChatDomainError['_tag']>([
  'ChatUnavailableError',
  'StorageError',
  'ThreadNotFoundError',
  'ThreadAlreadyExistsError',
  'ProviderError',
  'McpDiscoveryError',
  'McpServerUnavailableError',
  'StreamConflictError',
  'ValidationError',
])

export function unavailableResult(
  error = CHAT_UNAVAILABLE_USER_MESSAGE
): ResultFailure {
  return { success: false, error }
}

function unavailableError(): ChatUnavailableError {
  return new ChatUnavailableError({
    reason: 'runtime_not_ready',
    userMessage: CHAT_UNAVAILABLE_USER_MESSAGE,
  })
}

export function runChatPromise<A, E>(
  program: Effect.Effect<A, E, ChatServices>
): Promise<A> {
  const runtime = getManagedRuntime()
  if (!runtime) {
    return Promise.reject(toThrownError(unavailableError()))
  }
  return runtime.runPromiseExit(program).then(throwFromExit)
}

export function runChatSync<A, E>(
  program: Effect.Effect<A, E, ChatServices>
): A {
  const runtime = getManagedRuntime()
  if (!runtime) {
    throw toThrownError(unavailableError())
  }
  return throwFromExit(runtime.runSyncExit(program))
}

/** Like `runChatSync`, but returns `fallback` when the runtime is unavailable. */
export function runChatSyncOr<A, E>(
  program: Effect.Effect<A, E, ChatServices>,
  fallback: A
): A {
  const runtime = getManagedRuntime()
  if (!runtime) return fallback
  return throwFromExit(runtime.runSyncExit(program))
}

/** Like `runChatPromise`, but resolves to `fallback` when the runtime is unavailable. */
export function runChatPromiseOr<A, E>(
  program: Effect.Effect<A, E, ChatServices>,
  fallback: A
): Promise<A> {
  const runtime = getManagedRuntime()
  if (!runtime) return Promise.resolve(fallback)
  return runtime.runPromiseExit(program).then(throwFromExit)
}

function runChatPromiseExit<A, E>(
  program: Effect.Effect<A, E, ChatServices>
): Promise<Exit.Exit<A, E>> {
  const runtime = getManagedRuntime()
  if (!runtime) {
    return Promise.resolve(Exit.fail(unavailableError() as E))
  }
  return runtime.runPromiseExit(program)
}

export async function runChatToResult<A extends Record<string, unknown>, E>(
  program: Effect.Effect<A, E, ChatServices>
): Promise<OperationResult<A>> {
  const exit = await runChatPromiseExit(program)
  if (Exit.isSuccess(exit)) {
    return { success: true, ...exit.value }
  }

  const failure = Cause.failureOption(exit.cause)
  if (failure._tag === 'Some' && isDomainError(failure.value)) {
    return { success: false, error: getDomainUserMessage(failure.value) }
  }

  return {
    success: false,
    error: Cause.pretty(exit.cause) || 'Unknown error',
  }
}

/** Shared Exit → IPC result conversion used by adapters and persist helpers. */
export function operationResultFromExit<A extends Record<string, unknown>>(
  exit: Exit.Exit<A, unknown>
): OperationResult<A> {
  if (Exit.isSuccess(exit)) {
    return { success: true, ...exit.value }
  }

  const failure = Cause.failureOption(exit.cause)
  if (failure._tag === 'Some' && isDomainError(failure.value)) {
    return { success: false, error: getDomainUserMessage(failure.value) }
  }

  return {
    success: false,
    error: Cause.pretty(exit.cause) || 'Unknown error',
  }
}

export function runChatToResultSync<A extends Record<string, unknown>, E>(
  program: Effect.Effect<A, E, ChatServices>
): OperationResult<A> {
  const runtime = getManagedRuntime()
  if (!runtime) {
    return unavailableResult()
  }

  return operationResultFromExit(runtime.runSyncExit(program))
}

function isDomainError(error: unknown): error is ChatDomainError {
  return (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    typeof (error as { _tag: unknown })._tag === 'string' &&
    DOMAIN_ERROR_TAGS.has((error as { _tag: ChatDomainError['_tag'] })._tag) &&
    'userMessage' in error &&
    typeof (error as { userMessage: unknown }).userMessage === 'string'
  )
}

function toThrownError(error: ChatDomainError | Error): Error {
  if (isDomainError(error)) {
    const thrown = new Error(getDomainUserMessage(error))
    thrown.cause = error
    return thrown
  }
  return error
}

function throwFromExit<A, E>(exit: Exit.Exit<A, E>): A {
  if (Exit.isSuccess(exit)) {
    return exit.value
  }

  const failure = Cause.failureOption(exit.cause)
  if (failure._tag === 'Some') {
    if (isDomainError(failure.value)) {
      throw toThrownError(failure.value)
    }
    if (failure.value instanceof Error) {
      throw failure.value
    }
  }

  throw new Error(Cause.pretty(exit.cause) || 'Unknown error')
}
