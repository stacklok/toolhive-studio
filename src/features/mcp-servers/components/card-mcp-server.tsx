import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";

import type { RuntimeContainerInfo } from "@/common/api/generated";
import { TooltipStatusMcpServer } from "./tooltip-status-mcp-server";
import { Button } from "@/common/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ExternalLinkIcon } from "lucide-react";

type CardContentMcpServerProps = {
  state: RuntimeContainerInfo["State"];
  status: RuntimeContainerInfo["Status"];
  repoUrl?: string;
};

function CardContentMcpServer({
  state,
  status,
  repoUrl,
}: CardContentMcpServerProps) {
  return (
    <CardContent>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex gap-2 items-center">
          <TooltipStatusMcpServer state={state} status={status} />
          <span className="capitalize text-sm text-muted-foreground">
            {state}
          </span>
        </div>
        {repoUrl && (
          <div className="flex gap-2 items-center">
            <Button variant="outline" className="py-2 px-4">
              <Link
                to={repoUrl}
                className="flex gap-2 items-center"
                target="_blank"
              >
                Github <ExternalLinkIcon className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </CardContent>
  );
}

export function CardMcpServer({
  name,
  state,
  status,
  image,
  repoUrl,
  transport,
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
        <CardTitle className="flex items-center gap-2">
          {name}
          {transport && (
            <span className="text-xs font-normal bg-secondary px-2 py-1 rounded">
              {transport}
            </span>
          )}
        </CardTitle>
        <CardDescription>{image}</CardDescription>
      </CardHeader>
      <CardContentMcpServer state={state} status={status} repoUrl={repoUrl} />
    </Card>
  );
}
