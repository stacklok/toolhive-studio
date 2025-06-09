import type { RuntimeContainerInfo } from "@/common/api/generated";
import {
  postApiV1BetaServersByNameRestartMutation,
  getApiV1BetaServersByNameQueryKey,
  getApiV1BetaServersQueryKey,
} from "@/common/api/generated/@tanstack/react-query.gen";
import { useToastMutation } from "@/common/hooks/use-toast-mutation";
import { useQueryClient } from "@tanstack/react-query";

const mutationData = {
  ...postApiV1BetaServersByNameRestartMutation(),
  successMsg: `Server ${name} restarted successfully`,
  errorMsg: `Failed to restart server ${name}`,
  loadingMsg: `Restarting server ${name}...`,
};

export function useMutationRestartServerList({ name }: { name: string }) {
  const queryClient = useQueryClient();
  // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
  const queryKey = getApiV1BetaServersQueryKey({ query: { all: true } });

  return useToastMutation({
    ...mutationData,
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

export function useMutationRestartServer({ name }: { name: string }) {
  const queryClient = useQueryClient();
  const queryKey = getApiV1BetaServersByNameQueryKey({ path: { name } });
  return useToastMutation({
    ...mutationData,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const previousServerData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (oldData: string | undefined) => {
        if (!oldData) return oldData;

        const parsed = JSON.parse(oldData);
        if (!parsed) return oldData;

        const updatedData = {
          ...parsed,
          State: "running",
        };
        // Convert to string because of https://github.com/stacklok/toolhive/issues/497
        return JSON.stringify(updatedData);
      });

      return { previousServerData };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousServerData) {
        queryClient.setQueryData(queryKey, context.previousServerData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
        queryKey: getApiV1BetaServersQueryKey({ query: { all: true } }),
      });
    },
  });
}
