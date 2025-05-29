import type { RuntimeContainerInfo } from "@/common/api/generated";
import { CircularStatusIcon } from "@/common/components/ui/circular-status-icon";

// TODO: We don't know all the possible members of `state` yet
export function StatusIconMcpServer({
  state,
}: {
  state: RuntimeContainerInfo["State"];
}) {
  switch ((state ?? "unknown").toLowerCase()) {
    case "running":
      return <CircularStatusIcon variant="success" />;
    case "exited":
      return <CircularStatusIcon variant="default" />;
    case "restarting":
      return <CircularStatusIcon variant="warning" />;
    default:
      return <CircularStatusIcon variant="default" />;
  }
}
