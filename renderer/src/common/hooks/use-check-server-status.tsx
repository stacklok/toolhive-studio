import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pollServerStatus, pollingQueryKey } from '@/common/lib/polling'
import {
  getApiV1BetaWorkloadsByNameStatusOptions,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Link } from '@tanstack/react-router'
import { META_MCP_SERVER_NAME } from '../lib/constants'

/**
 * Custom hook for checking server status after creation/startup.
 * Returns a function that polls server status and invalidates queries when ready.
 */
export function useCheckServerStatus() {
  const toastIdRef = useRef(new Date().getTime())

  const queryClient = useQueryClient()

  const checkServerStatus = useCallback(
    async ({
      serverName,
      groupName,
      isEditing = false,
      quietly = false,
      customSuccessMessage,
      customLoadingMessage,
    }: {
      serverName: string
      groupName: string
      isEditing?: boolean
      quietly?: boolean
      customSuccessMessage?: string
      customLoadingMessage?: string
    }): Promise<boolean> => {
      if (!quietly) {
        const loadingMessage =
          customLoadingMessage ||
          `${isEditing ? 'Updating' : 'Starting'} "${serverName}"...`
        toast.loading(loadingMessage, {
          duration: 30_000,
          id: toastIdRef.current,
        })
      }

      const isServerReady = await queryClient.fetchQuery({
        queryKey: pollingQueryKey(serverName),
        queryFn: () =>
          pollServerStatus(
            () =>
              queryClient.fetchQuery(
                getApiV1BetaWorkloadsByNameStatusOptions({
                  path: { name: serverName },
                })
              ),
            'running'
          ),
        staleTime: 0,
      })

      if (isServerReady) {
        await queryClient.invalidateQueries({
          queryKey: getApiV1BetaWorkloadsQueryKey({
            query: { all: true, group: groupName },
          }),
        })

        // Also invalidate the specific server query to ensure form updates
        await queryClient.invalidateQueries({
          queryKey: getApiV1BetaWorkloadsByNameQueryKey({
            path: { name: serverName },
          }),
          refetchType: 'active',
        })

        if (!quietly) {
          const successMessage =
            customSuccessMessage ||
            `"${serverName === META_MCP_SERVER_NAME ? 'MCP Optimizer' : serverName}" ${isEditing ? 'updated' : 'started'} successfully.`

          toast.success(successMessage, {
            id: toastIdRef.current,
            duration: 5_000, // slightly longer than default
            action: (
              <Button asChild>
                <Link
                  to="/group/$groupName"
                  params={{ groupName }}
                  search={{ newServerName: serverName }}
                  onClick={() => toast.dismiss(toastIdRef.current)}
                  viewTransition={{ types: ['slide-left'] }}
                  className="ml-auto"
                >
                  View
                </Link>
              </Button>
            ),
          })
        }
      } else {
        if (!quietly) {
          toast.warning(
            `Server "${serverName}" was ${isEditing ? 'updated' : 'created'} but may still be starting up. Check the servers list to monitor its status.`,
            {
              id: toastIdRef.current,
              duration: 5_000,
            }
          )
        }
      }

      return isServerReady
    },
    [queryClient]
  )

  return { checkServerStatus }
}
