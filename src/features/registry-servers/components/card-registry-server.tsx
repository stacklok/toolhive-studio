import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/common/components/ui/card";
import type { RegistryServer } from "@/common/api/generated/types.gen";
import { Plus } from "lucide-react";

export function CardRegistryServer({
  server,
  onClick,
}: {
  server: RegistryServer;
  onClick?: () => void;
}) {
  return (
    <Card
      className="gap-3 py-5 hover:border-black dark:hover:border-white transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-xl">
          <span>{server.name}</span>
          <Plus className="size-5 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground text-sm">
          {server.description}
        </div>
      </CardContent>
    </Card>
  );
}
