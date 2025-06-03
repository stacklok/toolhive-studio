import { getApiV1BetaServersByNameOptions } from "@/common/api/generated/@tanstack/react-query.gen";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/server/$serverName")({
  component: RouteComponent,
  loader: ({ context: { queryClient }, params: { serverName } }) =>
    queryClient.ensureQueryData(
      getApiV1BetaServersByNameOptions({
        path: { name: serverName },
      }),
    ),
  gcTime: 0,
  shouldReload: false,
});

function RouteComponent() {
  const { serverName } = Route.useParams();
  const { data: serverData } = useSuspenseQuery(
    getApiV1BetaServersByNameOptions({
      path: { name: serverName },
    }),
  );

  return (
    <div>
      Hello "/server/$serverName"!
      <div>{JSON.stringify(serverData)}</div>
    </div>
  );
}
