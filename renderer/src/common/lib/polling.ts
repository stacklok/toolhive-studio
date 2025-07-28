/**
 * Functional, composable polling utilities
 */

import type { WorkloadsWorkload } from '../../../../api/generated/types.gen'
import { delay } from '../../../../utils/delay'

// Types
interface PollingConfig {
  maxAttempts?: number
  intervalMs?: number
  delayFirst?: boolean
}

type PollingPredicate<T> = (result: T, attempt: number) => boolean
type PollingCondition<T> = () => Promise<T>

interface PollingResult<T> {
  success: boolean
  result?: T
  attempts: number
  error?: Error
}

// Core polling engine
const createPoller = (config: PollingConfig = {}) => {
  const { maxAttempts = 20, intervalMs = 2000, delayFirst = false } = config

  return async <T>(
    condition: PollingCondition<T>,
    predicate: PollingPredicate<T>
  ): Promise<PollingResult<T>> => {
    const attemptRecursive = async (
      attempt: number,
      lastResult?: T,
      lastError?: Error
    ): Promise<PollingResult<T>> => {
      if (attempt >= maxAttempts) {
        return {
          success: false,
          result: lastResult,
          attempts: attempt,
          error: lastError,
        }
      }

      if (attempt > 0 || delayFirst) {
        await delay(intervalMs)
      }

      try {
        const result = await condition()

        if (predicate(result, attempt)) {
          return { success: true, result, attempts: attempt + 1 }
        }

        return attemptRecursive(attempt + 1, result)
      } catch (error) {
        const err = error as Error

        // Some predicates handle errors
        try {
          if (predicate(undefined as T, attempt)) {
            return {
              success: true,
              result: lastResult,
              attempts: attempt + 1,
              error: err,
            }
          }
        } catch {
          // Continue polling
        }

        return attemptRecursive(attempt + 1, lastResult, err)
      }
    }

    return attemptRecursive(0)
  }
}

// Predicate builders
const untilTrue =
  <T>(conditionFn: (result: T) => boolean): PollingPredicate<T> =>
  (result) =>
    conditionFn(result)

// Succeeds when error occurs
const untilError =
  <T>(): PollingPredicate<T> =>
  (result) =>
    result === undefined

// Specialized polling factories
const pollUntilTrue = <T>(
  condition: PollingCondition<T>,
  predicate: (result: T) => boolean,
  config?: PollingConfig
) => createPoller(config)(condition, untilTrue(predicate))

// Server utilities
const serverPredicates = {
  isRunning: (server: WorkloadsWorkload) => server?.status === 'running',
  hasStatus: (status: string) => (server: WorkloadsWorkload) =>
    server?.status === status,
}

// Public API
export const pollServerStatus = async (
  fetchServer: () => Promise<WorkloadsWorkload>,
  status: string,
  config?: PollingConfig
): Promise<boolean> => {
  const result = await pollUntilTrue(
    fetchServer,
    serverPredicates.hasStatus(status),
    config
  )
  return result.success
}

export const pollServerDelete = async (
  fetchServer: () => Promise<WorkloadsWorkload>,
  config?: PollingConfig
): Promise<boolean> => {
  const result = await createPoller(config)(
    fetchServer,
    untilError<WorkloadsWorkload>()
  )
  return result.success
}

export const pollBatchServerStatus = async (
  fetchServers: (serverNames: string[]) => Promise<WorkloadsWorkload[]>,
  serverNames: string[],
  status: string,
  config?: PollingConfig
): Promise<{ success: boolean; results: WorkloadsWorkload[] }> => {
  const result = await pollUntilTrue(
    () => fetchServers(serverNames),
    (servers) => servers.every((server) => server?.status === status),
    config
  )

  return {
    success: result.success,
    results: result.result || [],
  }
}
