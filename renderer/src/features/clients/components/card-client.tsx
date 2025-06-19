import type { ClientMcpClientStatus } from '@/common/api/generated'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/common/components/ui/card'
import { Switch } from '@/common/components/ui/switch'

// There is an issue with openAPI generator in BE, similar issue https://github.com/stacklok/toolhive/issues/780
const CLIENT_TYPE_LABEL_MAP = {
  'roo-code': 'Roo Code',
  cline: 'Cline',
  'vscode-insider': 'VS CodeI nsider',
  vscode: 'VS Code',
  cursor: 'Cursor',
  'claude-code': 'Claude Code',
} as const

export function CardClient({ client }: { client: ClientMcpClientStatus }) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          {CLIENT_TYPE_LABEL_MAP[
            client.client_type as keyof typeof CLIENT_TYPE_LABEL_MAP
          ] ?? client.client_type}
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
