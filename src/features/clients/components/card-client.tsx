import type { ClientMcpClientStatus } from "@/common/api/generated";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/common/components/ui/card";
import { Switch } from "@/common/components/ui/switch";

export function CardClient({ client }: { client: ClientMcpClientStatus }) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          {client.client_type}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {client.installed}
        {client.registered}
        <div className="text-muted-foreground text-sm"></div>
        <Switch className="cursor-pointer" checked={client.installed} />
      </CardContent>
    </Card>
  );
}
