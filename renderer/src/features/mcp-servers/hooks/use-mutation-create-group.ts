import { useQueryClient } from '@tanstack/react-query'
import { postApiV1BetaGroups } from '@api/sdk.gen'
import type { PostApiV1BetaGroupsData } from '@api/types.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'

export function useMutationCreateGroup() {
  const queryClient = useQueryClient()

  return useToastMutation({
    mutationFn: async (data: PostApiV1BetaGroupsData) => {
      try {
        const response = await postApiV1BetaGroups({
          body: data.body,
          parseAs: 'json',
          responseStyle: 'data',
          throwOnError: true,
        })
        return response
      } catch (error: unknown) {
        // Check if it's a 409 conflict error - handle multiple possible error structures
        const is409Error =
          // String errors (what we actually get from the API)
          (typeof error === 'string' &&
            (error.includes('409') ||
              error.toLowerCase().includes('already exists') ||
              error.toLowerCase().includes('group_already_exists'))) ||
          // Object errors (fallback for other possible structures)
          (error &&
            typeof error === 'object' &&
            // Direct status property
            (('status' in error &&
              (error as { status: unknown }).status === 409) ||
              // Response object with status
              ('response' in error &&
                (error as { response: { status?: unknown } }).response
                  ?.status === 409) ||
              // Check error message for 409
              (error instanceof Error && error.message.includes('409')) ||
              // Check plain object message for 409
              ('message' in error &&
                typeof (error as { message: unknown }).message === 'string' &&
                (error as { message: string }).message.includes('409')) ||
              // Check for conflict-related messages
              (error instanceof Error &&
                error.message.toLowerCase().includes('already exists')) ||
              ('message' in error &&
                typeof (error as { message: unknown }).message === 'string' &&
                (error as { message: string }).message
                  .toLowerCase()
                  .includes('already exists'))))

        if (is409Error) {
          const conflictError = new Error(
            `Group "${data.body.name}" already exists`
          ) as Error & { detail: string }
          conflictError.detail = `A group named "${data.body.name}" already exists. Please choose a different name.`
          throw conflictError
        }
        throw error
      }
    },
    onSuccess: () => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: ['api', 'v1beta', 'groups'] })
    },
    successMsg: (variables) =>
      `Group "${variables.body.name}" created successfully`,
    loadingMsg: 'Creating group...',
  })
}
