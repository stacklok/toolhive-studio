/**
 * Generic polling utility that repeatedly executes a condition check until it passes or times out
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface PollingOptions {
  /** Maximum number of attempts before giving up */
  maxAttempts?: number
  /** Delay between attempts in milliseconds */
  intervalMs?: number
  /** Current attempt number (used internally for recursion) */
  currentAttempt?: number
}

/**
 * Generic polling function that executes a condition check repeatedly
 * @param conditionFn Function that returns true when the desired condition is met
 * @param options Polling configuration options
 * @returns Promise that resolves to true if condition is met, false if timeout
 */
const poll = async <T>(
  conditionFn: () => Promise<T>,
  predicate: (result: T) => boolean,
  options: PollingOptions = {}
): Promise<boolean> => {
  const { maxAttempts = 20, intervalMs = 2000, currentAttempt = 0 } = options

  if (currentAttempt >= maxAttempts) {
    return false
  }

  if (currentAttempt > 0) {
    await delay(intervalMs)
  }

  try {
    const result = await conditionFn()

    if (predicate(result)) {
      return true
    }

    return poll(conditionFn, predicate, {
      ...options,
      currentAttempt: currentAttempt + 1,
    })
  } catch {
    // Continue polling on error
    return poll(conditionFn, predicate, {
      ...options,
      currentAttempt: currentAttempt + 1,
    })
  }
}

/**
 * Specialized polling function for server status
 * @param conditionFn Function that fetches and returns server data
 * @param options Polling configuration options
 * @returns Promise that resolves to true if server is running, false if timeout
 */
export const pollServerStatus = async (
  conditionFn: () => Promise<unknown>,
  options: PollingOptions = {}
): Promise<boolean> => {
  return poll(
    conditionFn,
    (serverData) => {
      // Parse the response if it's stringified (due to issue #495)
      const serverInfo =
        typeof serverData === 'string' ? JSON.parse(serverData) : serverData
      return serverInfo?.State === 'running'
    },
    options
  )
}
