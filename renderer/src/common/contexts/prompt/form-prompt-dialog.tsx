import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import type { FormikFormPromptConfig } from '.'
import { Formik, type FormikProps } from 'formik'

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
          validate={
            config.validate as
              | ((
                  values: TValues
                ) => Record<string, string> | Promise<Record<string, string>>)
              | undefined
          }
          validationSchema={config.validationSchema as unknown}
          onSubmit={(values) => onSubmit(values)}
          enableReinitialize
        >
          {(formik: FormikProps<TValues>) => (
            <form onSubmit={formik.handleSubmit}>
              <DialogHeader>
                <DialogTitle>{config.title || 'Form Input'}</DialogTitle>
                <DialogDescription>
                  {config.description || ''}
                </DialogDescription>
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
