import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'

import type { WorkloadsWorkload } from '@/common/api/generated'
import { ActionsMcpServer } from './actions-mcp-server'
import { useMutationRestartServerList } from '../hooks/use-mutation-restart-server'
import { useMutationStopServerList } from '../hooks/use-mutation-stop-server'

type CardContentMcpServerProps = {
  status: WorkloadsWorkload['status']
  statusContext: WorkloadsWorkload['status_context']
  repoUrl?: string
  name: string
}

function CardContentMcpServer({ name, status }: CardContentMcpServerProps) {
  const isRunning = status === 'running'
  const { mutateAsync: restartMutate, isPending: isRestartPending } =
    useMutationRestartServerList({
      name,
    })
  const { mutateAsync: stopMutate, isPending: isStopPending } =
    useMutationStopServerList({
      name,
    })

  return (
    <CardContent>
      <div className="border-border flex items-center justify-between border-t pt-4">
        <ActionsMcpServer
          status={status}
          isPending={isRestartPending || isStopPending}
          mutate={() => {
            if (isRunning) {
              return stopMutate({
                path: {
                  name,
                },
              })
            }

            return restartMutate({
              path: {
                name,
              },
            })
          }}
        />
      </div>
    </CardContent>
  )
}

export function CardMcpServer({
  name,
  status,
  statusContext,
  repoUrl,
}: {
  name: WorkloadsWorkload['name']
  status: WorkloadsWorkload['status']
  statusContext: WorkloadsWorkload['status_context']
  repoUrl?: string
  transport?: string
}) {
  return (
    <Card
      className="gap-3 py-5 shadow-none transition-colors hover:border-black
        dark:hover:border-white"
    >
      <CardHeader>
        <CardTitle className="flex items-center text-xl">{name}</CardTitle>
      </CardHeader>
      <CardContentMcpServer
        status={status}
        statusContext={statusContext}
        repoUrl={repoUrl}
        // name could be undefined this should be fixed in the API refactor
        name={name as string}
      />
    </Card>
  )
}
