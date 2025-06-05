import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";

import type { RuntimeContainerInfo } from "@/common/api/generated";
import { Switch } from "@/common/components/ui/switch";
import { useMutationRestartServer } from "@/common/hooks/useMutationRestartServer";
import { useMutationStopServer } from "@/common/hooks/useMutationStopServer";

type CardContentMcpServerProps = {
  state: RuntimeContainerInfo["State"];
  status: RuntimeContainerInfo["Status"];
  repoUrl?: string;
  name: string;
};

function getStatusText(state: RuntimeContainerInfo["State"]) {
  // We will have enum in the next API refactor
  if (state === "running") return "Running";
  if (state === "restarting") return "Restarting";
  if (state === "exited") return "Stopped";
  return "Unknown";
}

function CardContentMcpServer({ name, state }: CardContentMcpServerProps) {
  const isRestarting = state === "restarting";
  const isRunning = state === "running";
  const { mutateAsync: restartMutate } = useMutationRestartServer({
    name,
  });
  const { mutateAsync: stopMutate } = useMutationStopServer({
    name,
  });

  return (
    <CardContent>
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <Switch
            checked={isRunning}
            disabled={isRestarting}
            onCheckedChange={() => {
              if (isRunning) {
                stopMutate({
                  path: {
                    name,
                  },
                });
              } else {
                restartMutate({
                  path: {
                    name,
                  },
                });
              }
            }}
          />
          <span className="capitalize text-sm text-muted-foreground">
            {getStatusText(state)}
          </span>
        </div>
        <div className="flex gap-2 items-center"></div>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{name}</CardTitle>
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
