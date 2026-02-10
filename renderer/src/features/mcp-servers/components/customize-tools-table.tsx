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
import { useCallback, useState } from 'react'
import { Skeleton } from '@/common/components/ui/skeleton'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/common/components/ui/alert'
import { Badge } from '@/common/components/ui/badge'
import { TriangleAlert, Edit3, Wrench } from 'lucide-react'
import type { IsFromRegistryToolDiff } from '../hooks/use-is-server-from-registry'
import { trackEvent } from '@/common/lib/analytics'
import { useRouter } from '@tanstack/react-router'
import { DialogOverrideTool } from './dialog-override-tool'
import { useCustomizeToolsTable } from '../hooks/use-customize-tools-table'
import {
  getOriginalToolName,
  getDisplayName,
  getDisplayDescription,
  hasOverride,
  isLocalOverrideOnly,
} from '../lib/tool-override-utils'
import { useExpandableText } from '@/common/hooks/use-expandable-text'
import { ExpandableText } from './expandable-text'
import type { Tool, ToolOverrides } from '../types/tool-override'
import { useBlocker } from '@tanstack/react-router'
import { useConfirm } from '@/common/hooks/use-confirm'

interface CustomizeToolsTableProps {
  tools: Tool[]
  overrideTools?: ToolOverrides | null
  isLoading?: boolean
  toolsDiff?: IsFromRegistryToolDiff | null
  onApply?: (
    enabledTools: Record<string, boolean>,
    toolsOverride: ToolOverrides | null
  ) => Promise<void>
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
  overrideTools,
  toolsDiff,
  isLoading = true,
  drift,
  onApply,
}: CustomizeToolsTableProps) {
  const router = useRouter()
  const expandableText = useExpandableText({ lengthLimit: 200 })
  const [disableBlocker, setDisableBlocker] = useState(false)

  const {
    enabledTools,
    toolsOverride,
    editState,
    isAllToolsEnabled,
    isAllToolsDisabled,
    hasAnyChanges,
    handleToolToggle,
    handleAllToolsToggle,
    handleApply,
    handleEditTool,
    handleSaveToolOverride,
    handleCloseEditModal,
    handleNameChange,
    handleDescriptionChange,
  } = useCustomizeToolsTable({
    tools,
    overrideTools,
    onApply,
  })
  const confirm = useConfirm()

  useBlocker({
    shouldBlockFn: async () => {
      if (!hasAnyChanges) return false
      const hasConfirmedLeave = await confirm(
        'Are you sure you want to leave?',
        {
          title: 'Unsaved changes',
          description:
            'The changes you made will be lost if you leave this page.',
          buttons: { yes: 'Leave without saving', no: 'Cancel' },
        }
      )
      return !hasConfirmedLeave
    },
    enableBeforeUnload: hasAnyChanges,
    disabled: disableBlocker,
  })

  const handleGoBack = () => {
    setDisableBlocker(true)
    trackEvent('Customize Tools: Cancel click', {
      tools_count: Object.keys(enabledTools).length,
    })
    router.history.back()
  }

  const renderTableBody = useCallback(
    () =>
      isLoading
        ? Array.from({ length: 10 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
              <TableCell className="flex w-[60px] justify-center px-2 py-4">
                <Skeleton className="h-5 w-8 rounded" />
              </TableCell>
              <TableCell className="px-2 py-4">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="px-2 py-4">
                <Skeleton className="h-4 w-full max-w-md" />
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          ))
        : tools.map((tool) => {
            const originalName = getOriginalToolName(tool)
            const localOverride = toolsOverride[originalName]
            const displayName = getDisplayName(tool, localOverride)
            const displayDescription = getDisplayDescription(
              tool,
              localOverride
            )

            return (
              <TableRow key={tool.name} className="w-fit">
                <TableCell className="flex w-[60px] justify-center px-2 py-4">
                  <Switch
                    checked={enabledTools[tool.name] ?? true}
                    onCheckedChange={(checked) =>
                      handleToolToggle(tool.name, checked)
                    }
                    disabled={tools.length <= 1}
                  />
                </TableCell>
                <TableCell className="px-2 py-4 align-top whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {hasOverride(tool, toolsOverride, overrideTools) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Wrench
                            className={`size-4 ${
                              isLocalOverrideOnly(
                                tool,
                                toolsOverride,
                                overrideTools
                              )
                                ? 'text-orange-500'
                                : 'text-primary'
                              }`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          {isLocalOverrideOnly(
                            tool,
                            toolsOverride,
                            overrideTools
                          )
                            ? 'This tool has unsaved custom overrides'
                            : 'This tool has custom overrides applied'}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <span className="font-medium">{displayName}</span>
                  </div>
                </TableCell>
                <TableCell
                  className="text-muted-foreground w-auto px-2 py-4 align-top
                    break-words whitespace-normal"
                >
                  <ExpandableText
                    text={displayDescription}
                    expandKey={tool.name}
                    expandableText={expandableText}
                  />
                </TableCell>
                <TableCell className="w-[100px] align-top">
                  <Button
                    variant="secondary"
                    onClick={() => handleEditTool(tool)}
                  >
                    <Edit3 className="size-4" /> Edit
                  </Button>
                </TableCell>
              </TableRow>
            )
          }),
    [
      tools,
      isLoading,
      enabledTools,
      toolsOverride,
      overrideTools,
      expandableText,
      handleToolToggle,
      handleEditTool,
    ]
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
    <>
      <div className="flex h-full flex-col gap-5">
        {renderAlert()}
        <div className="flex min-h-0 flex-1 flex-col gap-5">
          <div
            className="bg-card max-h-full overflow-auto rounded-md border
              [&_[data-slot=table-container]]:overflow-visible"
          >
            <Table className={isLoading ? 'table-fixed' : 'table-auto'}>
              <colgroup>
                <col className="w-[60px] pl-3" />
                <col className="w-auto" />
                <col className="w-auto" />
                <col className="w-[100px]" />
              </colgroup>
              <TableHeader>
                {isLoading ? (
                  <TableRow
                    className="border-border bg-card sticky top-0 z-10 border-b"
                  >
                    <TableHead className="text-muted-foreground text-xs">
                      <Skeleton
                        className="bg-muted-foreground/80 ml-1 h-5 w-8 rounded"
                      />
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs">
                      <Skeleton className="bg-muted-foreground/80 h-4 w-24" />
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs">
                      <Skeleton
                        className="bg-muted-foreground/80 h-4 w-full max-w-md"
                      />
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs"></TableHead>
                  </TableRow>
                ) : (
                  <TableRow
                    className="border-border bg-card sticky top-0 z-10 border-b"
                  >
                    <TableHead className="text-muted-foreground text-xs">
                      <Switch
                        className="ml-1"
                        checked={isAllToolsEnabled}
                        onCheckedChange={(checked) =>
                          handleAllToolsToggle(checked)
                        }
                      />
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs">
                      Tool
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs">
                      Description
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                )}
              </TableHeader>
              <TableBody>{renderTableBody()}</TableBody>
            </Table>
          </div>

          <div className="flex flex-shrink-0 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="action"
                    className="rounded-full"
                    onClick={() => {
                      setDisableBlocker(true)
                      handleApply()
                    }}
                    disabled={isLoading || !hasAnyChanges || isAllToolsDisabled}
                  >
                    Apply
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasAnyChanges && !isLoading && (
                <TooltipContent>No changes to apply</TooltipContent>
              )}
              {isAllToolsDisabled && (
                <TooltipContent>
                  It is not possible to disable all tools
                </TooltipContent>
              )}
            </Tooltip>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={handleGoBack}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <DialogOverrideTool
        open={editState.isOpen}
        onOpenChange={(open) => !open && handleCloseEditModal()}
        tool={editState.tool}
        name={editState.name}
        description={editState.description}
        hasOverrideDescription={editState.hasOverrideDescription}
        onNameChange={handleNameChange}
        onDescriptionChange={handleDescriptionChange}
        onSave={() => {
          handleSaveToolOverride()
        }}
        onCancel={() => {
          handleCloseEditModal()
        }}
      />
    </>
  )
}
