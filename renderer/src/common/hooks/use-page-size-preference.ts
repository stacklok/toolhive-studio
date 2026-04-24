import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { useCallback } from 'react'
import type { UiPageSizeKey } from '../../../../main/src/ui-preferences'

function pageSizePreferenceQueryKey(key: UiPageSizeKey) {
  return ['ui-preference', 'page-size', key] as const
}

/**
 * Reads and writes a persisted paginated-list page-size preference backed by
 * the main-process SQLite `settings` table via IPC. Mirrors `useViewPreference`.
 *
 * Returns `undefined` until the initial read resolves so callers can fall
 * back to a URL search param or a hardcoded default without flashing the
 * wrong size.
 */
export function usePageSizePreference(key: UiPageSizeKey) {
  const queryClient = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: pageSizePreferenceQueryKey(key),
    queryFn: async (): Promise<number | null> => {
      try {
        const value = await window.electronAPI.uiPreferences.getPageSize(key)
        return typeof value === 'number' ? value : null
      } catch (error) {
        log.error(`Failed to read page size preference "${key}":`, error)
        return null
      }
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  const { mutate } = useMutation({
    mutationFn: async (value: number) => {
      await window.electronAPI.uiPreferences.setPageSize(key, value)
      return value
    },
    onMutate: async (value: number) => {
      await queryClient.cancelQueries({
        queryKey: pageSizePreferenceQueryKey(key),
      })
      const previous = queryClient.getQueryData<number | null>(
        pageSizePreferenceQueryKey(key)
      )
      queryClient.setQueryData(pageSizePreferenceQueryKey(key), value)
      return { previous }
    },
    onError: (error, _value, context) => {
      log.error(`Failed to persist page size preference "${key}":`, error)
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          pageSizePreferenceQueryKey(key),
          context.previous
        )
      }
    },
  })

  const setPageSize = useCallback(
    (value: number) => {
      mutate(value)
    },
    [mutate]
  )

  return {
    pageSize: data ?? undefined,
    isLoading: isPending,
    setPageSize,
  }
}
