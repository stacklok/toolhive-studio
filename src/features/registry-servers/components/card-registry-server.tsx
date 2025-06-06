import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/common/components/ui/card";
import type { RegistryServer } from "@/common/api/generated/types.gen";

export function CardRegistryServer({ server }: { server: RegistryServer }) {
  return (
    <Card className="gap-3 py-5 hover:border-black dark:hover:border-white transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          {server.name}
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
