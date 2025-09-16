import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/common/components/ui/card'
import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
} from '@api/types.gen'
import { CloudIcon, Github, LaptopIcon, Plus } from 'lucide-react'
import { cn } from '@/common/lib/utils'
import { Button } from '@/common/components/ui/button'
import { Stars } from './stars'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../utils/feature-flags'

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
  const isRemoteMcpEnabled = useFeatureFlag(featureFlagKeys.REMOTE_MCP)
  const isRemote = 'url' in server

  return (
    <Card
      className={cn(
        'relative cursor-pointer',
        'transition-[box-shadow,color]',
        'group',
        'hover:ring',
        'has-[button:focus-visible]:ring'
      )}
    >
      <CardHeader>
        <CardTitle
          className="grid grid-cols-[auto_calc(var(--spacing)_*_5)] items-center
            text-xl"
        >
          <button
            className="truncate text-left !outline-none select-none"
            onClick={() => onClick?.()}
          >
            {server.name}
            {/** make the entire area of the card clickable */}
            <span className="absolute inset-0 rounded-md" />{' '}
          </button>
          <Plus
            className="text-muted-foreground
              group-has-[button:focus-visible]:text-foreground
              group-hover:text-foreground transition-color size-5"
          />
          {server.status === statusMap.deprecated && (
            <span
              className="border-border text-muted-foreground bg-muted/20 my-1
                w-fit rounded-md border px-1.5 py-0.5 text-xs"
            >
              {server.status}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="text-muted-foreground text-sm select-none">
          {server.description}
        </div>
      </CardContent>
      <CardFooter className="mt-auto flex items-center gap-2">
        {isRemoteMcpEnabled && (
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
        )}
        {server?.metadata?.stars ? (
          <div className="flex items-center gap-2">
            <Stars stars={server.metadata.stars} />
          </div>
        ) : null}
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
      </CardFooter>
    </Card>
  )
}
