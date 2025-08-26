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
import { useState, useEffect } from 'react'
import { Skeleton } from '@/common/components/ui/skeleton'

interface Tool {
  name: string
  description?: string
}

interface CustomizeToolsTableProps {
  tools: Tool[]
  isLoading?: boolean
  onApply?: (enabledTools: Record<string, boolean>) => void
  onCancel?: () => void
}

export function CustomizeToolsTable({
  tools,
  isLoading = true,
  onApply,
  onCancel,
}: CustomizeToolsTableProps) {
  // State to track which tools are enabled
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>({})

  // Initialize enabled tools when tools data is available
  useEffect(() => {
    if (tools && tools.length > 0) {
      const initialState = tools.reduce(
        (acc, tool) => ({ ...acc, [tool.name]: true }),
        {}
      )
      setEnabledTools(initialState)
    }
  }, [tools])

  const handleToolToggle = (toolName: string, enabled: boolean) => {
    setEnabledTools((prev) => ({
      ...prev,
      [toolName]: enabled,
    }))
  }

  const handleApply = () => {
    onApply?.(enabledTools)
  }

  const handleCancel = () => {
    onCancel?.()
  }

  if (!isLoading && tools.length === 0) {
    return <div>No tools available</div>
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border border-b">
              <TableHead className="text-muted-foreground w-[60px] text-xs"></TableHead>
              <TableHead className="text-muted-foreground text-xs">
                Tool
              </TableHead>
              <TableHead className="text-muted-foreground text-xs">
                Description
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
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
                ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="default" onClick={handleApply} disabled={isLoading}>
          Apply
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
