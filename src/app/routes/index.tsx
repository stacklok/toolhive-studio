import type { V1ServerListResponse } from "@/common/api/generated";
import { getApiV1BetaServersOptions } from "@/common/api/generated/@tanstack/react-query.gen";
import { GridCardsMcpServers } from "@/features/mcp-servers/components/grid-cards-mcp-server";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

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

  if (!servers || servers.length === 0) {
    return <div>No servers found</div>;
  }

  return <GridCardsMcpServers mcpServers={servers} />;
}
