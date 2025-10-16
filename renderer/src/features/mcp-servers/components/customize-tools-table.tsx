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
import { useState, useEffect, useCallback } from 'react'
import { Skeleton } from '@/common/components/ui/skeleton'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/common/components/ui/alert'
import { Badge } from '@/common/components/ui/badge'
import { TriangleAlert } from 'lucide-react'

interface Tool {
  name: string
  description?: string
  isInitialEnabled?: boolean
}

interface CustomizeToolsTableProps {
  tools: Tool[]
  isLoading?: boolean
  onApply?: (enabledTools: Record<string, boolean>) => Promise<void>
  onReset?: () => void
  drift?: {
    localTag?: string
    registryTag?: string
  } | null
}

export function CustomizeToolsTable({
  tools,
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

  return (
    <div className="flex max-h-full flex-col gap-5">
      {drift && (
        <Alert>
          <TriangleAlert className="size-4 stroke-orange-600" />
          <AlertTitle className="flex items-center justify-between">
            <b>Tag drift detected</b>
          </AlertTitle>
          <AlertDescription>
            <p>
              This image has drifted from the version in the registry.{' '}
              <b>Local</b> image tag:{' '}
              <Badge variant="outline">{drift.localTag}</Badge> <b>Registry</b>{' '}
              image tag: <Badge variant="outline">{drift.registryTag}</Badge>{' '}
              <br />
              Please upgrade to the latest one. Enabled tools are up to date,x
              but some disabled tools may no longer match the current image.
            </p>
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-5">
        <div className="overflow-hidden rounded-md border">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[60px]" />
              <col className="w-[200px]" />
              <col />
            </colgroup>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow className="border-border border-b">
                <TableHead className="text-muted-foreground text-xs"></TableHead>
                <TableHead className="text-muted-foreground text-xs">
                  Tool
                </TableHead>
                <TableHead className="text-muted-foreground text-xs">
                  Description
                </TableHead>
              </TableRow>
            </TableHeader>
          </Table>
          <div className="max-h-[calc(100vh-350px)] overflow-auto">
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[60px]" />
                <col className="w-[200px]" />
                <col />
              </colgroup>
              <TableBody>{renderTableBody()}</TableBody>
            </Table>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="default" onClick={handleApply} disabled={isLoading}>
            Apply
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>
            Enable all tools
          </Button>
        </div>
      </div>
    </div>
  )
}
