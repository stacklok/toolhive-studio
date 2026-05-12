import { useCallback } from 'react'
import { toast } from 'sonner'

interface CopyOptions {
  successMessage?: string
  errorMessage?: string
}

const DEFAULT_SUCCESS_MESSAGE = 'Copied to clipboard'
const DEFAULT_ERROR_MESSAGE = 'Failed to copy to clipboard'

/**
 * Hook that wraps `navigator.clipboard.writeText` and surfaces success/failure
 * via `sonner` toasts. Returns a stable `copy` function so consumers can pass
 * it into event handlers without re-binding on every render.
 */
export function useCopyToClipboard() {
  const copy = useCallback(
    async (text: string, opts?: CopyOptions): Promise<void> => {
      const successMessage = opts?.successMessage ?? DEFAULT_SUCCESS_MESSAGE
      const errorMessage = opts?.errorMessage ?? DEFAULT_ERROR_MESSAGE
      try {
        await navigator.clipboard.writeText(text)
        toast.success(successMessage)
      } catch {
        toast.error(errorMessage)
      }
    },
    []
  )

  return { copy }
}
