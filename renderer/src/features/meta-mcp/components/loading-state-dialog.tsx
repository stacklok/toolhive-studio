import { LoadingStateAlert } from '@/common/components/ui/loading-state-alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/common/components/ui/dialog'

export function LoadingStateDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => onOpenChange(!open)}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          className="flex max-h-[95dvh] flex-col p-0 pb-8 sm:max-w-2xl"
          showCloseButton={false}
          onCloseAutoFocus={() => {}}
          onInteractOutside={(e) =>
            // Prevent closing the dialog when clicking outside
            e.preventDefault()
          }
        >
          <DialogHeader className="flex-shrink-0 p-6 pb-2">
            <DialogTitle>Installing MCP Optimizer...</DialogTitle>
          </DialogHeader>

          <LoadingStateAlert
            title="Installing..."
            description="Please wait while we download the docker image and configure the MCP Optimizer..."
          />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
