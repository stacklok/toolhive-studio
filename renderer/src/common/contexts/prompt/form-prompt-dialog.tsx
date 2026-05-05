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
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'

interface FormDialogProps {
  config: ReactHookFormPromptConfig<Record<string, unknown>>
  onSubmit: (data: Record<string, unknown>) => void
  onCancel: () => void
}

export function FormDialog({ config, onSubmit, onCancel }: FormDialogProps) {
  const form = useForm({
    defaultValues: config.defaultValues,
    resolver: config.resolver,
    mode: 'onChange',
  })

  useEffect(() => {
    if (config.validateOnMount) {
      void form.trigger()
    }
  }, [form, config.validateOnMount])

  const handleOpenChange = (open: boolean) => {
    if (!open) onCancel()
  }

  const handleCancel = () => {
    form.reset()
    onCancel()
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <DialogHeader className="px-1">
            <DialogTitle>{config.title || 'Form Input'}</DialogTitle>
            <DialogDescription>{config.description || ''}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-full max-h-[calc(85vh-8rem)] min-h-[40px]">
            <div className="space-y-4 p-1">
              {config.fields(form as UseFormReturn<Record<string, unknown>>)}
            </div>
          </ScrollArea>

          <DialogFooter className="px-1 pt-1">
            <Button
              variant={config.buttons?.cancelVariant ?? 'secondary'}
              className="rounded-full"
              onClick={handleCancel}
              type="button"
            >
              {config.buttons?.cancel ?? 'Cancel'}
            </Button>
            <Button
              variant={config.buttons?.confirmVariant ?? 'action'}
              className="rounded-full"
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              {config.buttons?.confirm ?? 'OK'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
