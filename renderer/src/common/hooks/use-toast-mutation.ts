// import { HTTPValidationError } from "@/api/generated";
import { toast } from 'sonner'

import {
  type DefaultError,
  useMutation,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { useCallback } from 'react'

export function useToastMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>({
  successMsg,
  errorMsg,
  loadingMsg,
  toastId,
  ...options
}: UseMutationOptions<TData, TError, TVariables, TContext> & {
  successMsg?: ((variables: TVariables) => string | null) | string | null
  loadingMsg?: string
  errorMsg?: string
  toastId?: string
}) {
  const {
    mutateAsync: originalMutateAsync,
    // NOTE: We are not allowing direct use of the `mutate` (sync) function
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutate: _,
    ...rest
  } = useMutation(options)

  const mutateAsync = useCallback(
    async <TError extends { detail: string | undefined | unknown }>(
      variables: Parameters<typeof originalMutateAsync>[0],
      options: Parameters<typeof originalMutateAsync>[1] = {}
    ) => {
      const promise = originalMutateAsync(variables, options)

      const resolvedSuccessMsg =
        typeof successMsg === 'function' ? successMsg(variables) : successMsg

      if (resolvedSuccessMsg !== null) {
        toast.promise(promise, {
          success: resolvedSuccessMsg,
          loading: loadingMsg ?? 'Loading...',
          error: (e: TError) => {
            if (errorMsg) return errorMsg

            if (typeof e.detail == 'string') {
              return e.detail ?? 'An error occurred'
            }

            if (Array.isArray(e.detail)) {
              const err = e.detail
                ?.map((item) => `${item.msg} - ${item.loc}`)
                .filter(Boolean)
                .join(', ')

              return err ?? 'An error occurred'
            }

            return 'An error occurred'
          },
          ...(toastId ? { id: toastId } : {}),
        })
      }

      return promise
    },
    [errorMsg, loadingMsg, originalMutateAsync, successMsg, toastId]
  )

  return { mutateAsync, ...rest }
}
