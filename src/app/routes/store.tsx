import { getApiV1BetaRegistryByNameServersOptions } from "@/common/api/generated/@tanstack/react-query.gen";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { GridCardsRegistryServer } from "@/features/registry-servers/components/grid-cards-registry-server";

export const Route = createFileRoute("/store")({
  loader: async ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameServersOptions({ path: { name: "default" } }),
    ),
  component: Store,
});

export function Store() {
  const storeData = useLoaderData({ from: "/store" });
  // TODO: https://github.com/stacklok/toolhive/issues/495
  const serversList =
    (storeData && JSON.parse(storeData as string)).servers || [];

  return (
    <>
      <div className="flex items-center mb-6">
        <h1 className="font-semibold text-3xl">Store</h1>
      </div>
      {serversList.length === 0 ? (
        <div>No items found</div>
      ) : (
        <GridCardsRegistryServer servers={serversList} />
      )}
    </>
  );
}
