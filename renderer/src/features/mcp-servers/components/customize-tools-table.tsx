import { Button } from '@/common/components/ui/button'
import { Switch } from '@/common/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/common/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { useState, useEffect, useCallback } from 'react'
import { Skeleton } from '@/common/components/ui/skeleton'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/common/components/ui/alert'
import { Badge } from '@/common/components/ui/badge'
import { TriangleAlert } from 'lucide-react'
import type { IsFromRegistryToolDiff } from '../hooks/use-is-server-from-registry'

interface Tool {
  name: string
  description?: string
  isInitialEnabled?: boolean
}

interface CustomizeToolsTableProps {
  tools: Tool[]
  isLoading?: boolean
  toolsDiff?: IsFromRegistryToolDiff | null
  onApply?: (enabledTools: Record<string, boolean>) => Promise<void>
  onReset?: () => void
  drift?: {
    localTag?: string
    registryTag?: string
  } | null
}

const getAlertMessageMap = () => {
  return {
    drift: {
      title: 'Tag drift detected',
      description: (drift: { localTag?: string; registryTag?: string }) => (
        <p>
          This image has drifted from the version in the registry. <b>Local</b>{' '}
          image tag: <Badge variant="outline">{drift?.localTag}</Badge>{' '}
          <b>Registry</b> image tag:{' '}
          <Badge variant="outline">{drift?.registryTag}</Badge> <br />
          Please upgrade to the latest one. Enabled tools are up to date, but
          some disabled tools may no longer match the current image.
        </p>
      ),
    },
    toolsDiff: {
      title: 'Tools differ from registry',
      description: (toolsDiff: IsFromRegistryToolDiff) => (
        <div className="space-y-2">
          <p>
            The tools available in the running server don't fully match the
            registry definition.
            <br />
            {toolsDiff.missingTools.length > 0 && (
              <span className="flex items-center gap-1">
                Missing from server:
                {toolsDiff.missingTools.map((tool) => (
                  <Badge key={tool} variant="outline">
                    {tool}
                  </Badge>
                ))}
              </span>
            )}
          </p>
        </div>
      ),
    },
  } as const
}

export function CustomizeToolsTable({
  tools,
  toolsDiff,
  isLoading = true,
  drift,
  onApply,
  onReset,
}: CustomizeToolsTableProps) {
  // State to track which tools are enabled
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>({})

  // Initialize enabled tools when tools data is available
  useEffect(() => {
    if (tools && tools.length > 0) {
      const initialState = tools.reduce(
        (acc, tool) => ({ ...acc, [tool.name]: tool.isInitialEnabled ?? true }),
        {}
      )
      setEnabledTools(initialState)
    }
  }, [])

  const handleToolToggle = (toolName: string, enabled: boolean) => {
    setEnabledTools((prev) => ({
      ...prev,
      [toolName]: enabled,
    }))
  }

  const handleApply = () => {
    onApply?.(enabledTools)
  }

  const handleReset = () => {
    onReset?.()
  }

  const renderTableBody = useCallback(
    () =>
      isLoading
        ? Array.from({ length: 10 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
              <TableCell className="w-[60px] px-2 py-4">
                <Skeleton className="h-5 w-8 rounded" />
              </TableCell>
              <TableCell className="px-2 py-4">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="px-2 py-4">
                <Skeleton className="h-4 w-full max-w-md" />
              </TableCell>
            </TableRow>
          ))
        : tools.map((tool) => (
            <TableRow key={tool.name}>
              <TableCell className="w-[60px] px-2 py-4">
                <Switch
                  checked={enabledTools[tool.name] ?? true}
                  onCheckedChange={(checked) =>
                    handleToolToggle(tool.name, checked)
                  }
                />
              </TableCell>
              <TableCell className="px-2 py-4">
                <span className="font-medium">{tool.name}</span>
              </TableCell>
              <TableCell
                className="text-muted-foreground px-2 py-4 break-words
                  whitespace-normal"
              >
                {tool.description || ''}
              </TableCell>
            </TableRow>
          )),
    [tools, isLoading, enabledTools]
  )

  if (!isLoading && tools.length === 0) {
    return <div>No tools available</div>
  }

  const getAlertConfig = () => {
    const alertMessageMap = getAlertMessageMap()

    if (drift) {
      const { title, description } = alertMessageMap.drift
      return { title, description: description(drift) }
    }

    if (toolsDiff && toolsDiff?.missingTools?.length > 0) {
      const { title, description } = alertMessageMap.toolsDiff
      return { title, description: description(toolsDiff) }
    }

    return null
  }

  const renderAlert = () => {
    const alertConfig = getAlertConfig()

    if (!alertConfig || isLoading) {
      return null
    }

    return (
      <Alert>
        <TriangleAlert className="size-4 stroke-orange-500" />
        <AlertTitle className="flex items-center justify-between">
          <b>{alertConfig.title}</b>
        </AlertTitle>
        <AlertDescription>{alertConfig.description}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex h-full flex-col gap-5">
      {renderAlert()}
      <div className="flex min-h-0 flex-1 flex-col gap-5">
        <div
          className="max-h-full overflow-auto rounded-md border
            [&_[data-slot=table-container]]:overflow-visible"
        >
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[60px]" />
              <col className="w-[200px]" />
              <col />
            </colgroup>
            <TableHeader>
              <TableRow
                className="border-border bg-muted sticky top-0 z-10 border-b"
              >
                <TableHead className="text-muted-foreground text-xs"></TableHead>
                <TableHead className="text-muted-foreground text-xs">
                  Tool
                </TableHead>
                <TableHead className="text-muted-foreground text-xs">
                  Description
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderTableBody()}</TableBody>
          </Table>
        </div>

        <div className="flex flex-shrink-0 gap-2">
          <Tooltip open={tools.length <= 1 ? undefined : false}>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  variant="default"
                  onClick={handleApply}
                  disabled={isLoading || tools.length <= 1}
                >
                  Apply
                </Button>
              </span>
            </TooltipTrigger>
            {tools.length <= 1 && (
              <TooltipContent>
                Tool filtering is only available when there are multiple tools
              </TooltipContent>
            )}
          </Tooltip>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isLoading || tools.length <= 1}
          >
            Enable all tools
          </Button>
        </div>
      </div>
    </div>
  )
}
