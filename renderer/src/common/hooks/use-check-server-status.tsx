import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pollServerStatus } from '@/common/lib/polling'
import {
  getApiV1BetaWorkloadsByNameStatusOptions,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameQueryKey,
} from '@api/@tanstack/react-query.gen'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Link } from '@tanstack/react-router'
import { META_MCP_SERVER_NAME } from '../lib/constants'

/**
 * Custom hook for checking server status after creation/startup.
 * Returns a function that polls server status and invalidates queries when ready.
 */
export function useCheckServerStatus() {
  const toastIdRef = useRef(new Date(Date.now()).toISOString())

  const queryClient = useQueryClient()

  const checkServerStatus = useCallback(
    async ({
      serverName,
      groupName,
      isEditing = false,
      quietly = false,
    }: {
      serverName: string
      groupName: string
      isEditing?: boolean
      quietly?: boolean
    }): Promise<boolean> => {
      if (!quietly) {
        toast.loading(
          `${isEditing ? 'Updating' : 'Starting'} "${serverName}"...`,
          {
            duration: 30_000,
            id: toastIdRef.current,
          }
        )
      }

      const isServerReady = await pollServerStatus(
        () =>
          queryClient.fetchQuery(
            getApiV1BetaWorkloadsByNameStatusOptions({
              path: { name: serverName },
            })
          ),
        'running'
      )

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
          toast.success(
            `"${serverName === META_MCP_SERVER_NAME ? 'MCP Optimizer' : serverName}" ${isEditing ? 'updated' : 'started'} successfully.`,
            {
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
            }
          )
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
