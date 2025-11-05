import { type FieldValues, type UseFormReturn } from 'react-hook-form'
import { Button } from '../ui/button'
import { Form } from '@/common/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '../ui/dialog'

export function DialogWorkloadFormWrapper<T extends FieldValues = FieldValues>({
  children,
  onOpenChange,
  isOpen = false,
  onCloseAutoFocus,
  actionsIsDisabled = false,
  actionsIsEditing = false,
  actionsOnCancel,
  actionsSubmitLabel,
  form,
  onSubmit,
  title,
}: {
  isOpen?: boolean
  form: UseFormReturn<T>
  children: React.ReactNode
  title: string
  actionsIsDisabled?: boolean
  actionsIsEditing?: boolean
  actionsSubmitLabel?: string
  onSubmit: () => void
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus: () => void
  actionsOnCancel: () => void
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          className="flex max-h-[95dvh] flex-col p-0 sm:max-w-2xl"
          onCloseAutoFocus={onCloseAutoFocus}
          showCloseButton={false}
          onInteractOutside={(e) =>
            // Prevent closing the dialog when clicking outside
            e.preventDefault()
          }
        >
          <Form {...form}>
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
              <DialogHeader className="flex-shrink-0 p-6 pb-4">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="sr-only">
                  ToolHive allows you to securely run a remote MCP server or a
                  custom local MCP server from a Docker image or a package
                  manager.
                </DialogDescription>
              </DialogHeader>

              {children}

              <DialogFooter className="p-6">
                <Button
                  type="button"
                  variant="outline"
                  disabled={actionsIsDisabled}
                  onClick={actionsOnCancel}
                >
                  Cancel
                </Button>
                <Button disabled={actionsIsDisabled} type="submit">
                  {actionsSubmitLabel ??
                    (actionsIsEditing ? 'Update server' : 'Install server')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
