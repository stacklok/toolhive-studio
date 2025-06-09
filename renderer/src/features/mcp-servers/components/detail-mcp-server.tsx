import { Button } from '@/common/components/ui/button'
import { Link } from '@tanstack/react-router'
import { ExternalLink, Trash2 } from 'lucide-react'
import { ActionsMcpServer } from './actions-mcp-server'
import { useMutationRestartServer } from '../hooks/use-mutation-restart-server'
import { useMutationStopServer } from '../hooks/use-mutation-stop-server'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/common/components/ui/tabs'
import { useDeleteServer } from '../hooks/use-delete-server'

export function DetailMcpServer({
  serverName,
  description,
  repo,
  state,
}: {
  serverName: string
  description: string
  repo: string
  state: string
}) {
  const { mutateAsync: restartMutate, isPending: isRestartPending } =
    useMutationRestartServer({
      name: serverName,
    })
  const { mutateAsync: stopMutate, isPending: isStopPending } =
    useMutationStopServer({
      name: serverName,
    })

  const { mutateAsync: deleteServer } = useDeleteServer({
    name: serverName,
  })

  return (
    <div className="mt-8">
      <Tabs
        defaultValue="description"
        orientation="vertical"
        className="flex w-full flex-row gap-8"
      >
        <TabsList className="flex h-fit w-48 shrink-0 flex-col space-y-1 bg-transparent p-0">
          <TabsTrigger
            value="health"
            className="hover:bg-muted w-full cursor-pointer justify-start border-none px-4 py-2
              !shadow-none transition-colors"
          >
            Health
          </TabsTrigger>

          <TabsTrigger
            value="description"
            className="hover:bg-muted w-full cursor-pointer justify-start border-none px-4 py-2
              !shadow-none transition-colors"
          >
            Description
          </TabsTrigger>
        </TabsList>

        <div className="min-w-0 flex-1">
          <TabsContent value="health" className="mt-0 w-full">
            <div className="p-2">
              <div className="text-muted-foreground text-base">
                Server health information will be displayed here
              </div>
            </div>
          </TabsContent>

          <TabsContent value="description" className="mt-0 w-full">
            <div className="flex flex-col gap-6 p-2">
              <div className="text-muted-foreground text-base">
                {description}
              </div>
              <div className="border-border border p-4">
                <ActionsMcpServer
                  state={state}
                  isPending={isRestartPending || isStopPending}
                  mutate={() => {
                    const isRunning = state === 'running'
                    if (isRunning) {
                      return stopMutate({
                        path: {
                          name: serverName,
                        },
                      })
                    }
                    return restartMutate({
                      path: {
                        name: serverName,
                      },
                    })
                  }}
                />
              </div>
              <div className="flex gap-4">
                <Button
                  disabled={state === 'running'}
                  variant="outline"
                  onClick={() =>
                    deleteServer({
                      path: {
                        name: serverName,
                      },
                    })
                  }
                >
                  <Trash2 /> Remove
                </Button>
                <Button variant="outline" asChild>
                  <Link to={repo} target="_blank" rel="noopener noreferrer">
                    <ExternalLink /> Github
                  </Link>
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
