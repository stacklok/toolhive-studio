import type { V1ServerListResponse } from "@/common/api/generated";
import {
  getApiV1BetaServersOptions,
  postApiV1BetaServersMutation,
} from "@/common/api/generated/@tanstack/react-query.gen";
import { useToastMutation } from "@/common/hooks/use-toast-mutation";
import { DialogFormRunMcpServerWithCommand } from "@/features/mcp-servers/components/dialog-form-run-mcp-command";
import { GridCardsMcpServers } from "@/features/mcp-servers/components/grid-cards-mcp-server";
import { DropdownMenuRunMcpServer } from "@/features/mcp-servers/components/menu-run-mcp-server";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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

  const [isRunWithCommandOpen, setIsRunWithCommandOpen] = useState(false);

  const { mutateAsync } = useToastMutation(postApiV1BetaServersMutation());

  return (
    <>
      <div className="flex items-center mb-6">
        <h1 className="font-semibold text-3xl">Installed</h1>
        <DropdownMenuRunMcpServer
          openRunCommandDialog={() => setIsRunWithCommandOpen(true)}
          className="ml-auto"
        />
        <DialogFormRunMcpServerWithCommand
          isOpen={isRunWithCommandOpen}
          onOpenChange={setIsRunWithCommandOpen}
          onSubmit={(data) => {
            mutateAsync({
              body: data,
            });
          }}
        />
      </div>
      {!servers || servers.length === 0 ? (
        <div>No servers found</div>
      ) : (
        <GridCardsMcpServers mcpServers={servers} />
      )}
    </>
  );
}
