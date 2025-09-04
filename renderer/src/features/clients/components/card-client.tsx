import type { ClientMcpClientStatus } from '@api/types.gen'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/common/components/ui/card'
import { Switch } from '@/common/components/ui/switch'
import { useAddClientToGroup } from '../hooks/use-add-client-to-group'
import { useRemoveClientFromGroup } from '../hooks/use-remove-client-from-group'

// There is an issue with openAPI generator in BE, similar issue https://github.com/stacklok/toolhive/issues/780
const CLIENT_TYPE_LABEL_MAP = {
  'roo-code': 'Roo Code',
  cline: 'Cline',
  'vscode-insider': 'VS Code Insiders - Copilot',
  vscode: 'VS Code - Copilot',
  cursor: 'Cursor',
  'claude-code': 'Claude Code',
} as const

export function CardClient({
  client,
  groupName,
}: {
  client: ClientMcpClientStatus
  groupName: string
}) {
  const { addClientToGroup } = useAddClientToGroup({
    clientType: client.client_type ?? '',
  })
  const { removeClientFromGroup } = useRemoveClientFromGroup({
    clientType: client.client_type ?? '',
  })

  return (
    <Card className="gap-3 border-none py-5 shadow-none outline-none">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center text-xl">
          {CLIENT_TYPE_LABEL_MAP[
            client.client_type as keyof typeof CLIENT_TYPE_LABEL_MAP
          ] ?? client.client_type}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={client.registered}
            onCheckedChange={() => {
              if (client.registered) {
                removeClientFromGroup({ groupName })
              } else {
                addClientToGroup({ groupName })
              }
            }}
          />
          <div className="text-muted-foreground text-sm">
            {client.registered ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
