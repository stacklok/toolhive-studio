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
import type { FormPromptConfig, FormikFormPromptConfig } from '.'
import { Formik, type FormikProps } from 'formik'

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
  const form = useForm<any>({
    resolver: zodV4Resolver(config.schema) as any,
    defaultValues: config.defaultValues as any,
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      form.reset(config.defaultValues as any)
    }
  }, [isOpen, config.defaultValues, form])

  const handleSubmit = (data: unknown) => {
    onSubmit(data as any)
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
        <Form {...(form as any)}>
          <form onSubmit={(form as any).handleSubmit(handleSubmit as any)}>
            <DialogHeader>
              <DialogTitle>{config.title || 'Form Input'}</DialogTitle>
              <DialogDescription>{config.description || ''}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">{config.renderForm(form as any)}</div>

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

// Formik-based prompt dialog
interface FormikFormPromptDialogProps<TValues extends object> {
  isOpen: boolean
  config: FormikFormPromptConfig<TValues>
  onSubmit: (data: TValues) => void
  onCancel: () => void
  onOpenChange: (open: boolean) => void
}

export function FormikFormPromptDialog<TValues extends object>({
  isOpen,
  config,
  onSubmit,
  onCancel,
  onOpenChange,
}: FormikFormPromptDialogProps<TValues>) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onCancel()
    } else {
      onOpenChange(open)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <Formik
          initialValues={config.initialValues}
          validate={config.validate as ((values: TValues) => Record<string, string> | Promise<Record<string, string>>) | undefined}
          validationSchema={config.validationSchema as unknown}
          onSubmit={(values) => onSubmit(values)}
          enableReinitialize
        >
          {(formik: FormikProps<TValues>) => (
            <form onSubmit={formik.handleSubmit}>
              <DialogHeader>
                <DialogTitle>{config.title || 'Form Input'}</DialogTitle>
                <DialogDescription>{config.description || ''}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">{config.fields(formik)}</div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    formik.handleReset()
                    onCancel()
                  }}
                  type="button"
                >
                  {config.buttons?.cancel ?? 'Cancel'}
                </Button>
                <Button type="submit" disabled={formik.isSubmitting}>
                  {config.buttons?.confirm ?? 'OK'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  )
}
