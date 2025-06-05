import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";

import type { RuntimeContainerInfo } from "@/common/api/generated";
import { ActionsMcpServer } from "./actions-mcp-server";
import { useMutationRestartServerList } from "../hooks/useMutationRestartServer";
import { useMutationStopServerList } from "../hooks/useMutationStopServer";

type CardContentMcpServerProps = {
  state: RuntimeContainerInfo["State"];
  status: RuntimeContainerInfo["Status"];
  repoUrl?: string;
  name: string;
};

function CardContentMcpServer({ name, state }: CardContentMcpServerProps) {
  const isRunning = state === "running";
  const { mutateAsync: restartMutate, isPending: isRestartPending } =
    useMutationRestartServerList({
      name,
    });
  const { mutateAsync: stopMutate, isPending: isStopPending } =
    useMutationStopServerList({
      name,
    });

  return (
    <CardContent>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <ActionsMcpServer
          state={state}
          isPending={isRestartPending || isStopPending}
          mutate={() => {
            if (isRunning) {
              return stopMutate({
                path: {
                  name,
                },
              });
            }

            return restartMutate({
              path: {
                name,
              },
            });
          }}
        />
      </div>
    </CardContent>
  );
}

export function CardMcpServer({
  name,
  state,
  status,
  repoUrl,
}: {
  name: RuntimeContainerInfo["Name"];
  state: RuntimeContainerInfo["State"];
  status: RuntimeContainerInfo["Status"];
  image: RuntimeContainerInfo["Image"];
  repoUrl?: string;
  transport?: string;
}) {
  return (
    <Card className="gap-3 py-5 hover:border-black dark:hover:border-white transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">{name}</CardTitle>
      </CardHeader>
      <CardContentMcpServer
        state={state}
        status={status}
        repoUrl={repoUrl}
        // name could be undefined this should be fixed in the API refactor
        name={name as string}
      />
    </Card>
  );
}
