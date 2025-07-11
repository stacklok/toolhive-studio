import type { ClientMcpClientStatus } from '@/common/api/generated'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/common/components/ui/card'
import { Switch } from '@/common/components/ui/switch'
import { useMutationRegisterClient } from '../hooks/use-mutation-register-client'
import { useMutationUnregisterClient } from '../hooks/use-mutation-unregister-client'
import { trackEvent } from '@/common/lib/analytics'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { InfoIcon } from 'lucide-react'

// There is an issue with openAPI generator in BE, similar issue https://github.com/stacklok/toolhive/issues/780
const CLIENT_TYPE_LABEL_MAP = {
  'roo-code': 'Roo Code',
  cline: 'Cline',
  'vscode-insider': 'VS Code Insiders - Copilot',
  vscode: 'VS Code - Copilot',
  cursor: 'Cursor',
  'claude-code': 'Claude Code',
} as const

export function CardClient({ client }: { client: ClientMcpClientStatus }) {
  const { mutateAsync: registerClient } = useMutationRegisterClient(
    client.client_type ?? ''
  )
  const { mutateAsync: unregisterClient } = useMutationUnregisterClient(
    client.client_type ?? ''
  )

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
                unregisterClient({
                  path: {
                    name: client.client_type ?? '',
                  },
                })
                trackEvent(`Client ${client.client_type} unregistered`, {
                  client: client.client_type,
                })
              } else {
                registerClient({
                  body: {
                    name: client.client_type ?? '',
                  },
                })
                trackEvent(`Client ${client.client_type} registered`, {
                  client: client.client_type,
                })
              }
            }}
          />
          <div className="text-muted-foreground text-sm">
            {client.registered ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {client.client_type === 'claude-code' && (
          <Tooltip>
            <TooltipTrigger className="text-muted-foreground flex items-center gap-2">
              <InfoIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent className="w-96">
              <p>Restart Claude Code to activate new MCP servers</p>
            </TooltipContent>
          </Tooltip>
        )}
      </CardContent>
    </Card>
  )
}
