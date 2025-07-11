import { LinkViewTransition } from '@/common/components/link-view-transition'
import { Button } from '@/common/components/ui/button'
import { Separator } from '@/common/components/ui/separator'
import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { ChevronLeft, GithubIcon, ShieldCheck, Wrench } from 'lucide-react'
import { getApiV1BetaRegistryByNameServersByServerNameOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Stars } from '@/features/registry-servers/components/Stars'
import { Badge } from '@/common/components/ui/badge'
import type { RegistryImageMetadata } from '@/common/api/generated/types.gen'
import { useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { FormRunFromRegistry } from '@/features/registry-servers/components/form-run-from-registry'

const statusMap = {
  deprecated: 'Deprecated',
  active: 'Active',
} as const satisfies Record<string, RegistryImageMetadata['status']>

const INITIAL_TOOLS_LIMIT = 10

export const Route = createFileRoute('/(registry)/registry_/$name')({
  loader: ({ context: { queryClient }, params }) => {
    return queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameServersByServerNameOptions({
        path: {
          name: 'default',
          serverName: params.name,
        },
      })
    )
  },
  component: RegistryServerDetail,
})

export function RegistryServerDetail() {
  const { name } = useParams({ from: '/(registry)/registry_/$name' })
  const {
    data: { server },
  } = useSuspenseQuery(
    getApiV1BetaRegistryByNameServersByServerNameOptions({
      path: {
        name: 'default',
        serverName: name,
      },
    })
  )
  const [showAllTools, setShowAllTools] = useState(false)
  const [selectedServer, setSelectedServer] =
    useState<RegistryImageMetadata | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!server) return null

  const handleCardClick = (server: RegistryImageMetadata) => {
    setSelectedServer(server)
    setIsModalOpen(true)
  }

  const toolsToShow = showAllTools
    ? server.tools
    : server.tools?.slice(0, INITIAL_TOOLS_LIMIT)

  const hasMoreTools = server.tools && server.tools.length > INITIAL_TOOLS_LIMIT
  const repositoryUrl = server.repository_url

  return (
    <div className="flex max-h-full w-full flex-1 flex-col">
      <div className="mb-2">
        <LinkViewTransition to="/">
          <Button
            variant="ghost"
            aria-label="Back"
            className="text-muted-foreground"
          >
            <ChevronLeft className="size-5" />
            Back
          </Button>
        </LinkViewTransition>
      </div>
      <div className="flex flex-col gap-5">
        <h1 className="m-0 mb-0 p-0 text-3xl font-bold">{name}</h1>
        <div className="flex items-center gap-3">
          <Badge variant="default">{server.tier}</Badge>
          {server.status === statusMap.deprecated && (
            <Badge variant="outline">{server.status}</Badge>
          )}
          <Badge variant="secondary">{server.transport}</Badge>
          <Stars stars={server.metadata?.stars} className="size-4" />
          <Tooltip>
            <TooltipTrigger className="text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="size-4" />
              <span className="text-sm">Provenance signed by Sigstore</span>
            </TooltipTrigger>
            <TooltipContent className="w-96">
              <p>
                The {name} MCP server has been cryptographically signed and its
                build provenance verified through Sigstore, confirming its
                authenticity and integrity
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="my-8 flex w-3/5 flex-col gap-8">
        <div className="text-muted-foreground flex-[2] select-none">
          {server.description}
        </div>

        {server?.tools?.length && (
          <div className="flex w-3/5 flex-[3] flex-col gap-4">
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
                  className="hover:bg-primary/80 cursor-pointer transition-colors"
                  onClick={() => setShowAllTools(!showAllTools)}
                >
                  {!showAllTools ? 'Show more' : 'Show less'}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      <Separator className="my-6" />
      <div className="flex gap-5">
        <Button variant="default" onClick={() => handleCardClick(server)}>
          <Wrench className="size-4" />
          Install server
        </Button>
        <Link to={repositoryUrl} target="_blank">
          <Button variant="outline">
            <GithubIcon className="size-4" />
            GitHub
          </Button>
        </Link>
      </div>

      <FormRunFromRegistry
        key={selectedServer?.name}
        server={selectedServer}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  )
}
