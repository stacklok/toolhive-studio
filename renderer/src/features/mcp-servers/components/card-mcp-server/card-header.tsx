import { CardHeader, CardTitle } from '@/common/components/ui/card'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/common/components/ui/tooltip'
import type {
  CoreWorkload,
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
} from '@common/api/generated/types.gen'
import { ServerActionsDropdown } from './server-actions'
import { CloudIcon, LaptopIcon } from 'lucide-react'
import { useRef } from 'react'
import { twMerge } from 'tailwind-merge'

interface CardHeaderMcpServerProps {
  name: string
  url: string
  status: CoreWorkload['status']
  remote: boolean
  group?: CoreWorkload['group']
  isStopped: boolean
  isFromRegistry: boolean
  drift: { localTag: string; registryTag: string } | null
  matchedRegistryItem:
    | RegistryImageMetadata
    | RegistryRemoteServerMetadata
    | undefined
  onRecheck: () => void
  isCheckingCompliance: boolean
}

export function CardHeaderMcpServer({
  name,
  url,
  status,
  remote,
  group,
  isStopped,
  isFromRegistry,
  drift,
  matchedRegistryItem,
  onRecheck,
  isCheckingCompliance,
}: CardHeaderMcpServerProps) {
  const nameRef = useRef<HTMLElement | null>(null)

  return (
    <CardHeader>
      <div className="flex items-center justify-between gap-6 overflow-hidden">
        <CardTitle
          className={twMerge(
            'min-w-0 flex-1 text-xl',
            isStopped && 'text-foreground/65'
          )}
        >
          <Tooltip onlyWhenTruncated>
            <TooltipTrigger asChild>
              <span ref={nameRef} className="block cursor-default truncate">
                {name}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{name}</TooltipContent>
          </Tooltip>
        </CardTitle>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              {remote ? (
                <CloudIcon className="size-5" />
              ) : (
                <LaptopIcon className="size-5" />
              )}
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {remote ? 'Remote MCP server' : 'Local MCP server'}
            </TooltipContent>
          </Tooltip>
          <ServerActionsDropdown
            name={name}
            url={url}
            status={status}
            remote={remote}
            group={group}
            isFromRegistry={isFromRegistry}
            drift={drift}
            matchedRegistryItem={matchedRegistryItem}
            onRecheck={onRecheck}
            isCheckingCompliance={isCheckingCompliance}
          />
        </div>
      </div>
    </CardHeader>
  )
}
