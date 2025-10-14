import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
} from '@api/types.gen'
import { CloudIcon, Github, LaptopIcon } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { Stars } from './stars'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { CardRegistryBase } from './card-registry-base'

const statusMap = {
  deprecated: 'Deprecated',
  active: 'Active',
} as const satisfies Record<string, RegistryImageMetadata['status']>

export function CardRegistryServer({
  server,
  onClick,
}: {
  server: RegistryImageMetadata | RegistryRemoteServerMetadata
  onClick?: () => void
}) {
  const isRemote = 'url' in server

  const badge =
    server.status === statusMap.deprecated ? (
      <span
        className="border-border text-muted-foreground bg-muted/20 my-1 w-fit
          rounded-md border px-1.5 py-0.5 text-xs"
      >
        {server.status}
      </span>
    ) : null

  const footer = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative z-10">
            {isRemote ? (
              <CloudIcon className="text-muted-foreground size-5" />
            ) : (
              <LaptopIcon className="text-muted-foreground size-5" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {isRemote ? 'Remote MCP server' : 'Local MCP server'}
        </TooltipContent>
      </Tooltip>
      {server?.repository_url ? (
        <Button
          variant="ghost"
          asChild
          onClick={(e) => e.stopPropagation()}
          className="relative z-10"
        >
          <a
            href={server.repository_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="text-muted-foreground size-4" />
          </a>
        </Button>
      ) : null}
      {server?.metadata?.stars ? (
        <div className="flex items-center gap-2">
          <Stars stars={server.metadata.stars} />
        </div>
      ) : null}
    </>
  )

  return (
    <CardRegistryBase
      title={server.name!}
      description={server.description}
      badge={badge}
      footer={footer}
      onClick={onClick}
    />
  )
}
