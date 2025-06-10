import {
  deleteApiV1BetaWorkloadsByNameMutation,
  getApiV1BetaWorkloadsQueryKey,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

export function useDeleteServer({ name }: { name: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useToastMutation({
    successMsg: `Server ${name} deleted successfully`,
    errorMsg: `Failed to delete server ${name}`,
    loadingMsg: `Deleting server ${name}...`,
    ...deleteApiV1BetaWorkloadsByNameMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })
      console.log('redirecting')
      navigate({ to: '/' })
    },
  })
}
