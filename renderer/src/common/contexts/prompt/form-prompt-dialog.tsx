import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { Form } from '@/common/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import type { z } from 'zod/v4'
import type { FormPromptConfig } from '.'

interface FormPromptDialogProps<TSchema extends z.ZodType> {
  isOpen: boolean
  config: FormPromptConfig<TSchema>
  onSubmit: (data: z.infer<TSchema>) => void
  onCancel: () => void
  onOpenChange: (open: boolean) => void
}

export function FormPromptDialog<TSchema extends z.ZodType>({
  isOpen,
  config,
  onSubmit,
  onCancel,
  onOpenChange,
}: FormPromptDialogProps<TSchema>) {
  const form = useForm<z.infer<TSchema>>({
    resolver: zodV4Resolver(config.schema),
    defaultValues: config.defaultValues,
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      form.reset(config.defaultValues)
    }
  }, [isOpen, config.defaultValues, form])

  const handleSubmit = (data: z.infer<TSchema>) => {
    onSubmit(data)
  }

  const handleCancel = () => {
    form.reset()
    onCancel()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel()
    } else {
      onOpenChange(open)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>{config.title || 'Form Input'}</DialogTitle>
              <DialogDescription>{config.description || ''}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">{config.renderForm(form)}</div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} type="button">
                {config.buttons?.cancel ?? 'Cancel'}
              </Button>
              <Button type="submit">{config.buttons?.confirm ?? 'OK'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
