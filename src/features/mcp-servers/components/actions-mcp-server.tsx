import type { RuntimeContainerInfo } from "@/common/api/generated/types.gen";
import { Switch } from "@/common/components/ui/switch";

function getStatusText(state: RuntimeContainerInfo["State"]) {
  // We will have enum in the next API refactor
  if (state === "running") return "Running";
  if (state === "restarting") return "Restarting";
  if (state === "exited") return "Stopped";
  return "Unknown";
}

export function ActionsMcpServer({
  state,
  isPending,
  mutate,
}: {
  state: RuntimeContainerInfo["State"];
  isPending: boolean;
  mutate: () => void;
}) {
  const isRestarting = state === "restarting";
  const isRunning = state === "running";

  return (
    <div className="flex gap-2">
      <div onClick={(e) => e.preventDefault()}>
        <Switch
          className="cursor-pointer"
          checked={isRunning || isPending}
          disabled={isRestarting}
          onCheckedChange={() => mutate()}
        />
      </div>
      <span className="capitalize text-sm text-muted-foreground">
        {getStatusText(state)}
      </span>
    </div>
  );
}
