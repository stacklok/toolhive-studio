/**
 * Checks if an error indicates that a resource already exists (409 conflict)
 * @param error - The error to check
 * @returns true if the error indicates a resource already exists
 */
export function doesAlreadyExist(error: unknown): boolean {
  // String errors (what we actually get from the API)
  if (typeof error === 'string') {
    return (
      error.includes('409') || error.toLowerCase().includes('already exists')
    )
  }

  // Object errors with status property
  if (error && typeof error === 'object') {
    // Direct status property
    if ('status' in error && (error as { status: unknown }).status === 409) {
      return true
    }

    // Response object with status
    if (
      'response' in error &&
      (error as { response: { status?: unknown } }).response?.status === 409
    ) {
      return true
    }

    // Check error message for 409
    if (error instanceof Error && error.message.includes('409')) {
      return true
    }

    // Check plain object message for 409
    if (
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string' &&
      (error as { message: string }).message.includes('409')
    ) {
      return true
    }

    // Check for conflict-related messages
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes('already exists')
    ) {
      return true
    }

    if (
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string' &&
      (error as { message: string }).message
        .toLowerCase()
        .includes('already exists')
    ) {
      return true
    }
  }

  return false
}
