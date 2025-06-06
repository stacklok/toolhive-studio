import { getApiV1BetaDiscoveryClientsOptions } from "@/common/api/generated/@tanstack/react-query.gen";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { V1ClientStatusResponse } from "@/common/api/generated";
import { GridCardClients } from "@/features/clients/components/grid-card-clients";
import { Button } from "@/common/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/clients")({
  component: Clients,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getApiV1BetaDiscoveryClientsOptions()),
});

export function Clients() {
  const { data } = useSuspenseQuery(getApiV1BetaDiscoveryClientsOptions());

  const { clients }: V1ClientStatusResponse = JSON.parse(data as string);

  return (
    <>
      <div className="flex items-center mb-6 justify-between">
        <h1 className="font-semibold text-3xl">Clients</h1>
        <Button>
          <Check />
          Enable all clients
        </Button>
      </div>
      {!clients || clients.length === 0 ? (
        <div>No clients found</div>
      ) : (
        <GridCardClients clients={clients} />
      )}
    </>
  );
}
