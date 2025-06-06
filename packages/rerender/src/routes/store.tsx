import {
  getApiV1BetaRegistryByNameServersOptions,
  postApiV1BetaServersMutation,
  getApiV1BetaServersByNameOptions,
  getApiV1BetaServersQueryKey,
} from "@/common/api/generated/@tanstack/react-query.gen";
import { pollServerStatus } from "@/common/lib/polling";
import { useToastMutation } from "@/common/hooks/use-toast-mutation";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { GridCardsRegistryServer } from "@/features/registry-servers/components/grid-cards-registry-server";
import type {
  RegistryServer,
  V1CreateRequest,
} from "@/common/api/generated/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/store")({
  loader: async ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameServersOptions({ path: { name: "default" } }),
    ),
  component: Store,
});

export function Store() {
  const storeData = useLoaderData({ from: "/store" });
  const queryClient = useQueryClient();
  const { mutateAsync } = useToastMutation({
    ...postApiV1BetaServersMutation(),
    loadingMsg: "Creating server...",
    errorMsg: "Failed to create server",
  });

  // TODO: https://github.com/stacklok/toolhive/issues/495
  const serversList =
    (storeData && JSON.parse(storeData as string)).servers || [];

  const handleSubmit = async (
    server: RegistryServer,
    data: { name: string; envVars: { name: string; value: string }[] },
  ) => {
    try {
      const envVarsForApi = data.envVars.map(
        (envVar) => `${envVar.name}=${envVar.value}`,
      );

      const createRequest: V1CreateRequest = {
        name: data.name,
        image: server.image,
        transport: server.transport,
        env_vars: envVarsForApi.length > 0 ? envVarsForApi : undefined,
        cmd_arguments: server.args,
        target_port: server.target_port,
      };

      await mutateAsync({
        body: createRequest,
      });

      const serverName = data.name;

      const statusToastId = toast.loading(
        `Waiting for server "${serverName}" to be ready...`,
        {
          duration: 30000, // 30 second timeout
        },
      );

      const isServerReady = await pollServerStatus(() =>
        queryClient.fetchQuery(
          getApiV1BetaServersByNameOptions({ path: { name: serverName } }),
        ),
      );

      toast.dismiss(statusToastId);

      if (isServerReady) {
        toast.success(`Server "${serverName}" is now running and ready!`, {
          duration: 5000,
        });

        // Invalidate queries to refresh server lists
        queryClient.invalidateQueries({
          // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
          queryKey: getApiV1BetaServersQueryKey({ query: { all: true } }),
        });
      } else {
        toast.warning(
          `Server "${serverName}" was created but may still be starting up. Check the servers list to monitor its status.`,
          {
            duration: 8000,
          },
        );
      }
    } catch (error) {
      console.error("Server creation failed:", error);
      // Error is already handled by useToastMutation
    }
  };

  return (
    <>
      <div className="flex items-center mb-6">
        <h1 className="font-semibold text-3xl">Store</h1>
      </div>
      {serversList.length === 0 ? (
        <div>No items found</div>
      ) : (
        <GridCardsRegistryServer
          servers={serversList}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
