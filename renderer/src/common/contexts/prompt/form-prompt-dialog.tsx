import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { ScrollArea } from '@/common/components/ui/scroll-area'
import type { ReactHookFormPromptConfig } from '.'
import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'

interface FormDialogProps {
  isOpen: boolean
  config: ReactHookFormPromptConfig<Record<string, unknown>>
  onSubmit: (data: Record<string, unknown>) => void
  onCancel: () => void
  onOpenChange: (open: boolean) => void
}

export function FormDialog({
  isOpen,
  config,
  onSubmit,
  onCancel,
  onOpenChange,
}: FormDialogProps) {
  const form = useForm({
    defaultValues: config.defaultValues,
    resolver: config.resolver,
    mode: 'onChange',
  })

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onCancel()
    } else {
      onOpenChange(open)
    }
  }

  const handleSubmit = (data: Record<string, unknown>) => {
    onSubmit(data)
  }

  const handleCancel = () => {
    form.reset()
    onCancel()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-6"
        >
          <DialogHeader>
            <DialogTitle>{config.title || 'Form Input'}</DialogTitle>
            <DialogDescription>{config.description || ''}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-full max-h-[calc(85vh-8rem)] min-h-[40px]">
            <div className="space-y-4 pr-4">
              {config.fields(form as UseFormReturn<Record<string, unknown>>)}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant={config.buttons?.cancelVariant ?? 'secondary'}
              onClick={handleCancel}
              type="button"
            >
              {config.buttons?.cancel ?? 'Cancel'}
            </Button>
            <Button
              variant={config.buttons?.confirmVariant ?? 'default'}
              type="submit"
              disabled={
                form.formState.isSubmitting ||
                (config.disableSubmitUntilValid !== false &&
                  !form.formState.isValid)
              }
            >
              {config.buttons?.confirm ?? 'OK'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
