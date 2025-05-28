import { getApiV1BetaServersOptions } from "@/common/api/generated/@tanstack/react-query.gen";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getApiV1BetaServersOptions()),
  component: Index,
});

export function Index() {
  const serversQuery = useSuspenseQuery(getApiV1BetaServersOptions());
  const servers = serversQuery.data.servers;

  if (!servers) {
    return <div>No servers found</div>;
  }

  return (
    <div className="p-2">
      {servers?.map((server) => <div key={server.id}>{server.name}</div>)}
    </div>
  );
}
