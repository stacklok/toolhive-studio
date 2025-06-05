import type { V1ServerListResponse } from "@/common/api/generated";
import { getApiV1BetaServersOptions } from "@/common/api/generated/@tanstack/react-query.gen";
import { Button } from "@/common/components/ui/button";
import { GridCardsMcpServers } from "@/features/mcp-servers/components/grid-cards-mcp-server";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(
      // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
      getApiV1BetaServersOptions({ query: { all: true } }),
    ),
  component: Index,
});

export function Index() {
  const serversQuery = useSuspenseQuery(
    // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
    getApiV1BetaServersOptions({ query: { all: true } }),
  );
  // TODO: https://github.com/stacklok/toolhive/issues/495
  const parsed: V1ServerListResponse = JSON.parse(serversQuery.data as string);
  const servers = parsed.servers;

  return (
    <>
      <div className="flex items-center mb-6">
        <h1 className="font-semibold text-3xl">Installed</h1>
        <Button className="ml-auto">
          <PlusIcon />
          Add tool
        </Button>
      </div>
      {!servers || servers.length === 0 ? (
        <div>No servers found</div>
      ) : (
        <GridCardsMcpServers mcpServers={servers} />
      )}
    </>
  );
}
