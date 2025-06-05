import { useQueryClient } from "@tanstack/react-query";
import {
  postApiV1BetaServersByNameStopMutation,
  getApiV1BetaServersByNameQueryKey,
  getApiV1BetaServersQueryKey,
} from "../api/generated/@tanstack/react-query.gen";
import { useToastMutation } from "./use-toast-mutation";
import type {
  RuntimeContainerInfo,
  V1ServerListResponse,
} from "../api/generated";

export function useMutationStopServer({ name }: { name: string }) {
  const queryClient = useQueryClient();
  // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
  const queryKey = getApiV1BetaServersQueryKey({ query: { all: true } });

  return useToastMutation({
    ...postApiV1BetaServersByNameStopMutation(),
    successMsg: `Server ${name} stopped successfully`,
    errorMsg: `Failed to stop server ${name}`,
    loadingMsg: `Stopping server ${name}...`,

    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey,
      });

      const previousServer = queryClient.getQueryData(
        getApiV1BetaServersByNameQueryKey({ path: { name } }),
      );

      queryClient.setQueryData(
        getApiV1BetaServersByNameQueryKey({ path: { name } }),
        (oldData: RuntimeContainerInfo | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            State: "exited",
          };
        },
      );

      queryClient.setQueryData(queryKey, (oldData: string | undefined) => {
        if (!oldData) return oldData;

        const parsed: V1ServerListResponse = JSON.parse(oldData);
        if (!parsed?.servers) return oldData;

        const updatedData = {
          ...parsed,
          servers: parsed.servers.map((server: RuntimeContainerInfo) =>
            server.Name === name ? { ...server, State: "exited" } : server,
          ),
        };
        // Convert to string because of https://github.com/stacklok/toolhive/issues/497
        return JSON.stringify(updatedData);
      });

      return { previousServer };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousServer) {
        queryClient.setQueryData(queryKey, context.previousServer);
      }
    },
  });
}
