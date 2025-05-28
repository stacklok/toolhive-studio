import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";

import type { RuntimeContainerInfo } from "@/common/api/generated";
import { TooltipStatusMcpServer } from "./tooltip-status-mcp-server";

export function CardMcpServer({
  name,
  state,
  status,
  image,
}: {
  name: RuntimeContainerInfo["Name"];
  state: RuntimeContainerInfo["State"];
  status: RuntimeContainerInfo["Status"];
  image: RuntimeContainerInfo["Image"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{name}</CardTitle>
        <CardDescription>{image}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 items-center">
          <TooltipStatusMcpServer state={state} status={status} />
          <span className="capitalize text-sm text-muted-foreground">
            {state}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
