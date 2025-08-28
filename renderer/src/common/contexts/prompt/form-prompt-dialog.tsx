import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import type { ReactHookFormPromptConfig } from '.'
import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'

interface ReactHookFormPromptDialogProps {
  isOpen: boolean
  config: ReactHookFormPromptConfig<Record<string, unknown>>
  onSubmit: (data: Record<string, unknown>) => void
  onCancel: () => void
  onOpenChange: (open: boolean) => void
}

export function ReactHookFormPromptDialog({
  isOpen,
  config,
  onSubmit,
  onCancel,
  onOpenChange,
}: ReactHookFormPromptDialogProps) {
  const form = useForm({
    defaultValues: config.defaultValues,
    resolver: config.resolver,
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
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <DialogHeader>
            <DialogTitle>{config.title || 'Form Input'}</DialogTitle>
            <DialogDescription>{config.description || ''}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {config.fields(form as UseFormReturn<Record<string, unknown>>)}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} type="button">
              {config.buttons?.cancel ?? 'Cancel'}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {config.buttons?.confirm ?? 'OK'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
