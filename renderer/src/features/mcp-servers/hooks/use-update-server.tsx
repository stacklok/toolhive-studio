import {
  postApiV1BetaWorkloadsByNameEditMutation,
  getApiV1BetaWorkloadsByNameStatusOptions,
  getApiV1BetaWorkloadsQueryKey,
} from '@api/@tanstack/react-query.gen'
import { pollServerStatus } from '@/common/lib/polling'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'

import { type V1UpdateRequest } from '@api/types.gen'
import { toast } from 'sonner'
import { Button } from '@/common/components/ui/button'
import { Link } from '@tanstack/react-router'
import { restartClientNotification } from '../lib/restart-client-notification'
import { trackEvent } from '@/common/lib/analytics'

type UpdateServerCheck = () => Promise<unknown> | unknown

export function useUpdateServer(serverName: string) {
  const toastIdRef = useRef(new Date(Date.now()).toISOString())
  const queryClient = useQueryClient()

  const { mutateAsync: updateWorkload } = useMutation({
    ...postApiV1BetaWorkloadsByNameEditMutation(),
  })

  const handleSettled = useCallback<UpdateServerCheck>(async () => {
    toast.loading(`Updating "${serverName}"...`, {
      duration: 30_000,
      id: toastIdRef.current,
    })

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
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })

      toast.success(`"${serverName}" updated successfully.`, {
        id: toastIdRef.current,
        duration: 5_000,
        action: (
          <Button asChild>
            <Link
              to="/"
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
    } else {
      toast.warning(
        `Server "${serverName}" was updated but may still be restarting. Check the servers list to monitor its status.`,
        {
          id: toastIdRef.current,
          duration: 5_000,
        }
      )
    }
  }, [queryClient, serverName])

  const { mutate: updateServerMutation } = useMutation({
    mutationFn: async ({
      updateRequest,
    }: {
      updateRequest: V1UpdateRequest
    }) => {
      await updateWorkload({
        path: { name: serverName },
        body: updateRequest,
      })
      await restartClientNotification({
        queryClient,
      })
      trackEvent(`Workload ${serverName} updated`, {
        workload: serverName,
        'route.pathname': '/customize-tools',
      })
    },
  })

  return {
    updateServerMutation,
    checkServerStatus: handleSettled,
  }
}
