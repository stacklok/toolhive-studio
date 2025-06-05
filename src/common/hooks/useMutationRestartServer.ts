import { useQueryClient } from "@tanstack/react-query";
import {
  postApiV1BetaServersByNameRestartMutation,
  getApiV1BetaServersQueryKey,
} from "../api/generated/@tanstack/react-query.gen";
import { useToastMutation } from "./use-toast-mutation";
import type { RuntimeContainerInfo } from "../api/generated";

export function useMutationRestartServer({ name }: { name: string }) {
  const queryClient = useQueryClient();
  // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
  const queryKey = getApiV1BetaServersQueryKey({ query: { all: true } });

  return useToastMutation({
    ...postApiV1BetaServersByNameRestartMutation(),
    successMsg: `Server ${name} restarted successfully`,
    errorMsg: `Failed to restart server ${name}`,
    loadingMsg: `Restarting server ${name}...`,

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const previousServersList = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (oldData: string | undefined) => {
        if (!oldData) return oldData;

        const parsed = JSON.parse(oldData);
        if (!parsed?.servers) return oldData;

        const updatedData = {
          ...parsed,
          servers: parsed.servers.map((server: RuntimeContainerInfo) =>
            server.Name === name ? { ...server, State: "running" } : server,
          ),
        };
        // Convert to string because of https://github.com/stacklok/toolhive/issues/497
        return JSON.stringify(updatedData);
      });

      return { previousServersList };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousServersList) {
        queryClient.setQueryData(queryKey, context.previousServersList);
      }
    },
  });
}
