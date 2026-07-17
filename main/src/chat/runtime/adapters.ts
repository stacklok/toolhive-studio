import { Cause, Effect, Exit } from 'effect'
import {
  CHAT_UNAVAILABLE_USER_MESSAGE,
  ChatUnavailableError,
  type ChatDomainError,
  getDomainUserMessage,
  StorageError,
} from './errors'
import { isChatRuntimeReady } from './health'
import { getManagedRuntimeOrThrow, type ChatServices } from './managed-runtime'

export type ResultSuccess<T> = { success: true } & T
export type ResultFailure = { success: false; error: string }
export type OperationResult<
  T extends Record<string, unknown> = Record<string, unknown>,
> = ResultSuccess<T> | ResultFailure

export function unavailableResult(
  error = CHAT_UNAVAILABLE_USER_MESSAGE
): ResultFailure {
  return { success: false, error }
}

export function runChatPromise<A, E, R>(
  program: Effect.Effect<A, E, R>
): Promise<A> {
  if (!isChatRuntimeReady()) {
    return Promise.reject(
      toThrownError(
        new ChatUnavailableError({
          reason: 'runtime_not_ready',
          userMessage: CHAT_UNAVAILABLE_USER_MESSAGE,
        })
      )
    )
  }
  return getManagedRuntimeOrThrow()
    .runPromiseExit(program as Effect.Effect<A, E, ChatServices>)
    .then(throwFromExit)
}

export function runChatSync<A, E, R>(program: Effect.Effect<A, E, R>): A {
  if (!isChatRuntimeReady()) {
    throw toThrownError(
      new ChatUnavailableError({
        reason: 'runtime_not_ready',
        userMessage: CHAT_UNAVAILABLE_USER_MESSAGE,
      })
    )
  }
  return throwFromExit(
    getManagedRuntimeOrThrow().runSyncExit(
      program as Effect.Effect<A, E, ChatServices>
    )
  )
}

export function runChatPromiseExit<A, E, R>(
  program: Effect.Effect<A, E, R>
): Promise<Exit.Exit<A, E>> {
  if (!isChatRuntimeReady()) {
    return Promise.resolve(
      Exit.fail(
        new ChatUnavailableError({
          reason: 'runtime_not_ready',
          userMessage: CHAT_UNAVAILABLE_USER_MESSAGE,
        }) as E
      )
    )
  }
  return getManagedRuntimeOrThrow().runPromiseExit(
    program as Effect.Effect<A, E, ChatServices>
  )
}

export async function runChatToResult<A extends Record<string, unknown>, E, R>(
  program: Effect.Effect<A, E, R>
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

export function runChatToResultSync<A extends Record<string, unknown>, E, R>(
  program: Effect.Effect<A, E, R>
): OperationResult<A> {
  if (!isChatRuntimeReady()) {
    return unavailableResult()
  }

  const exit = getManagedRuntimeOrThrow().runSyncExit(
    program as Effect.Effect<A, E, ChatServices>
  )
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

function isDomainError(error: unknown): error is ChatDomainError {
  return (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    typeof (error as { _tag: unknown })._tag === 'string'
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

export function mapUnknownToStorageError(
  operation: string,
  error: unknown
): Effect.Effect<never, StorageError> {
  return Effect.fail(
    new StorageError({
      operation,
      cause: error,
      userMessage:
        error instanceof Error ? error.message : 'A storage operation failed.',
    })
  )
}
