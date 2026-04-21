import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { useCallback } from 'react'
import type {
  UiPreferenceKey,
  ViewMode,
} from '../../../../main/src/ui-preferences'

const DEFAULT_VIEW_MODE: ViewMode = 'card'

function viewPreferenceQueryKey(key: UiPreferenceKey) {
  return ['ui-preference', 'view-mode', key] as const
}

/**
 * Reads and writes a persisted card/table view preference for a given page,
 * backed by the main-process SQLite `settings` table via IPC.
 *
 * Returns `card` as the optimistic default while the initial read resolves so
 * the UI can render without a flicker.
 */
export function useViewPreference(key: UiPreferenceKey) {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: viewPreferenceQueryKey(key),
    queryFn: async (): Promise<ViewMode> => {
      try {
        return await window.electronAPI.uiPreferences.getViewMode(key)
      } catch (error) {
        log.error(`Failed to read view preference "${key}":`, error)
        return DEFAULT_VIEW_MODE
      }
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  const { mutate } = useMutation({
    mutationFn: async (value: ViewMode) => {
      await window.electronAPI.uiPreferences.setViewMode(key, value)
      return value
    },
    onMutate: async (value: ViewMode) => {
      await queryClient.cancelQueries({
        queryKey: viewPreferenceQueryKey(key),
      })
      const previous = queryClient.getQueryData<ViewMode>(
        viewPreferenceQueryKey(key)
      )
      queryClient.setQueryData(viewPreferenceQueryKey(key), value)
      return { previous }
    },
    onError: (error, _value, context) => {
      log.error(`Failed to persist view preference "${key}":`, error)
      if (context?.previous !== undefined) {
        queryClient.setQueryData(viewPreferenceQueryKey(key), context.previous)
      }
    },
  })

  const setView = useCallback(
    (value: ViewMode) => {
      mutate(value)
    },
    [mutate]
  )

  return {
    view: data ?? DEFAULT_VIEW_MODE,
    setView,
  }
}
