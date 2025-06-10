import type { ClientMcpClientStatus } from '@/common/api/generated'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/common/components/ui/card'
import { Switch } from '@/common/components/ui/switch'

export function CardClient({ client }: { client: ClientMcpClientStatus }) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          {client.client_type}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Switch className="cursor-pointer" checked={client.registered} />
        <div className="text-muted-foreground text-sm">
          {client.registered ? 'Connected' : 'Disconnected'}
        </div>
      </CardContent>
    </Card>
  )
}
