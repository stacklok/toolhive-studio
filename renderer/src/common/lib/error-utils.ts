/**
 * Checks if an error indicates that a resource already exists (409 conflict)
 * @param error - The error to check
 * @returns true if the error indicates a resource already exists
 */
export function doesAlreadyExist(error: unknown): boolean {
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
  }

  return false
}
