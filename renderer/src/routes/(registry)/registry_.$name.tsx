import { Button } from '@/common/components/ui/button'
import { Separator } from '@/common/components/ui/separator'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoSearchResults } from '@/common/components/illustrations/illustration-no-search-results'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import {
  createFileRoute,
  Link,
  notFound,
  useParams,
} from '@tanstack/react-router'
import { Cloud, GithubIcon, Monitor, ShieldCheck, Wrench } from 'lucide-react'
import { getApiV1BetaRegistryByNameServersByServerNameOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { getApiV1BetaRegistryByNameServersByServerName } from '@common/api/generated/sdk.gen'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Stars } from '@/features/registry-servers/components/stars'
import { Badge } from '@/common/components/ui/badge'
import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
} from '@common/api/generated/types.gen'
import { useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { FormRunFromRegistry } from '@/features/registry-servers/components/form-run-from-registry'
import { trackEvent } from '@/common/lib/analytics'
import { DialogFormRemoteRegistryMcp } from '@/features/registry-servers/components/dialog-form-remote-registry-mcp'
import { RegistryDetailHeader } from '@/features/registry-servers/components/registry-detail-header'

const statusMap = {
  deprecated: 'Deprecated',
  active: 'Active',
} as const satisfies Record<string, RegistryImageMetadata['status']>

const INITIAL_TOOLS_LIMIT = 10

function RegistryServerNotFound() {
  return (
    <div className="flex max-h-full w-full flex-1 flex-col">
      <RegistryDetailHeader title="Server Not Found" />
      <EmptyState
        illustration={IllustrationNoSearchResults}
        title="Server Not Found"
        body="The server you're looking for doesn't exist in the registry or has been removed."
        actions={[
          <Button asChild key="registry">
            <LinkViewTransition to="/registry">
              Browse Registry
            </LinkViewTransition>
          </Button>,
        ]}
      />
    </div>
  )
}

export const Route = createFileRoute('/(registry)/registry_/$name')({
  loader: async ({ context: { queryClient }, params }) => {
    const pathOptions = {
      path: { name: 'default' as const, serverName: params.name },
    }
    return queryClient.ensureQueryData({
      ...getApiV1BetaRegistryByNameServersByServerNameOptions(pathOptions),
      queryFn: async ({ signal }) => {
        const result = await getApiV1BetaRegistryByNameServersByServerName({
          ...pathOptions,
          signal,
        })
        if (result.error !== undefined) {
          if (result.response.status === 404) {
            throw notFound()
          }
          throw result.error
        }
        return result.data
      },
    })
  },
  component: RegistryServerDetail,
  notFoundComponent: RegistryServerNotFound,
})

export function RegistryServerDetail() {
  const { name } = useParams({ from: '/(registry)/registry_/$name' })
  const {
    data: { server: localServer, remote_server: remoteServer },
  } = useSuspenseQuery(
    getApiV1BetaRegistryByNameServersByServerNameOptions({
      path: {
        name: 'default',
        serverName: name,
      },
    })
  )
  const server = localServer || remoteServer
  const isRemoteServer = !!remoteServer
  const [showAllTools, setShowAllTools] = useState(false)
  const [selectedServer, setSelectedServer] = useState<
    RegistryImageMetadata | RegistryRemoteServerMetadata | null
  >(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!server) return null

  const handleCardClick = (
    server: RegistryImageMetadata | RegistryRemoteServerMetadata
  ) => {
    setSelectedServer(server)
    setIsModalOpen(true)
  }

  const toolsToShow = showAllTools
    ? server.tools
    : server.tools?.slice(0, INITIAL_TOOLS_LIMIT)

  const hasTools = server.tools && server.tools.length > 0
  const hasMoreTools = server.tools && server.tools.length > INITIAL_TOOLS_LIMIT
  const hasProvenance = 'provenance' in server && server.provenance
  const repositoryUrl = server.repository_url

  return (
    <div className="flex max-h-full w-full flex-1 flex-col">
      <RegistryDetailHeader
        title={name}
        badges={
          <>
            {server.tier && <Badge variant="default">{server.tier}</Badge>}
            <Badge variant="secondary" className="text-muted-foreground">
              {isRemoteServer ? (
                <>
                  <Cloud className="size-3" /> Remote
                </>
              ) : (
                <>
                  <Monitor className="size-3" /> Local
                </>
              )}
            </Badge>
            {server.status === statusMap.deprecated && (
              <Badge variant="outline">{server.status}</Badge>
            )}
            <Badge variant="secondary" className="text-muted-foreground">
              {server.transport}
            </Badge>
            <Stars stars={server.metadata?.stars} className="size-4" />
            {hasProvenance && (
              <Tooltip>
                <TooltipTrigger
                  className="text-muted-foreground flex items-center gap-1"
                >
                  <ShieldCheck className="size-4" />
                  <span className="text-sm">Provenance signed by Sigstore</span>
                </TooltipTrigger>
                <TooltipContent className="w-96">
                  <p>
                    The {name} MCP server has been cryptographically signed and
                    its build provenance verified through Sigstore, confirming
                    its authenticity and integrity
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        }
        description={server.description}
      />
      {hasTools && (
        <div className="mt-6 mb-2 flex w-3/5 flex-col gap-8">
          <div className="flex w-3/5 flex-3 flex-col gap-2">
            <p className="text-base font-bold">Tools listed</p>
            <div className="flex flex-wrap gap-2">
              {toolsToShow?.map((tool) => (
                <Badge key={tool} variant="outline">
                  {tool}
                </Badge>
              ))}
              {hasMoreTools && (
                <Badge
                  variant="default"
                  className="hover:bg-primary/80 cursor-pointer
                    transition-colors"
                  onClick={() => {
                    setShowAllTools(!showAllTools)
                    if (!showAllTools) {
                      trackEvent(`Registry ${name} tools more`, {
                        name,
                      })
                    }
                  }}
                >
                  {!showAllTools ? 'Show more' : 'Show less'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      <Separator className="my-6" />
      <div className="flex gap-5 pb-10">
        <Button
          variant="action"
          className="rounded-full"
          onClick={() => handleCardClick(server)}
        >
          <Wrench className="size-4" />
          Install server
        </Button>
        {repositoryUrl && (
          <Link to={repositoryUrl} target="_blank">
            <Button variant="outline" className="rounded-full">
              <GithubIcon className="size-4" />
              GitHub
            </Button>
          </Link>
        )}
      </div>

      {isRemoteServer ? (
        <DialogFormRemoteRegistryMcp
          key={selectedServer?.name}
          server={selectedServer}
          isOpen={isModalOpen}
          closeDialog={() => setIsModalOpen(false)}
          actionsSubmitLabel="Install server"
        />
      ) : (
        <FormRunFromRegistry
          key={selectedServer?.name}
          server={selectedServer}
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          actionsSubmitLabel="Install server"
        />
      )}
    </div>
  )
}
