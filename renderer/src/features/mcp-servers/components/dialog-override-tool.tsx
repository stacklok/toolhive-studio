import { Button } from '@/common/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { Textarea } from '@/common/components/ui/textarea'
import { useExpandableText } from '@/common/hooks/use-expandable-text'
import { ExpandableText } from './expandable-text'
import type { Tool } from '../types/tool-override'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { InfoIcon } from 'lucide-react'

interface DialogOverrideToolProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tool: Tool | null
  name: string
  description: string
  hasOverrideDescription: boolean
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onSave: () => void
  onCancel: () => void
}

export function DialogOverrideTool({
  open,
  onOpenChange,
  tool,
  name,
  description,
  hasOverrideDescription,
  onNameChange,
  onDescriptionChange,
  onSave,
  onCancel,
}: DialogOverrideToolProps) {
  const expandableText = useExpandableText({ lengthLimit: 200 })
  const originalDescription = hasOverrideDescription
    ? 'N/A'
    : tool?.originalDescription || 'N/A'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>Edit tool</DialogTitle>
          <DialogDescription>
            Customize the tool name and description
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="space-y-2">
            <Label htmlFor="tool-name">
              Tool
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="size-3" />
                </TooltipTrigger>
                <TooltipContent>
                  Left empty to reset it to original state
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="tool-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
            <p className="text-muted-foreground text-sm">
              Original tool name: {tool?.name || ''}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tool-description">
              Description
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="size-3" />
                </TooltipTrigger>
                <TooltipContent>
                  Left empty to reset it to original state
                </TooltipContent>
              </Tooltip>
            </Label>
            <Textarea
              id="tool-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="h-[240px] resize-none overflow-y-auto"
            />
            <div className="text-muted-foreground space-y-1 text-sm">
              <span>Original tool description: </span>
              {originalDescription === 'N/A' ? (
                <span>N/A</span>
              ) : (
                <ExpandableText
                  text={originalDescription}
                  expandKey="original-description"
                  expandableText={expandableText}
                />
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-shrink-0">
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button variant="action" onClick={onSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
