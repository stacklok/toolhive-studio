import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/ui/tooltip";
import { StatusIconMcpServer } from "./status-icon-mcp-server";
import type { RuntimeContainerInfo } from "@/common/api/generated";

export function TooltipStatusMcpServer({
  state,
  status,
}: {
  state: RuntimeContainerInfo["State"];
  status: RuntimeContainerInfo["Status"];
}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <StatusIconMcpServer state={state} />
      </TooltipTrigger>
      <TooltipContent>
        <p>{status}</p>
      </TooltipContent>
    </Tooltip>
  );
}
