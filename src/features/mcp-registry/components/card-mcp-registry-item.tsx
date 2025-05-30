import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";

import type { McpRegistryItem } from "@/common/constants/mcp-registry";
import { ClockIcon, StarIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function CardMcpRegistryItem({
  name,
  description,
  stars,
  last_updated,
}: {
  name: McpRegistryItem["name"];
  description: McpRegistryItem["description"];
  stars: McpRegistryItem["metadata"]["stars"];
  last_updated: McpRegistryItem["metadata"]["last_updated"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent></CardContent>
      <CardFooter className="mt-auto">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-3 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Updated{" "}
            {formatDistanceToNow(new Date(last_updated), { addSuffix: true })}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StarIcon className="size-3 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {Intl.NumberFormat().format(stars)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
