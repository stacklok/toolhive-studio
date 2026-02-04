import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/components/ui/form'
import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { z } from 'zod/v4'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

const createSecretSchema = z.object({
  key: z.string().min(1, 'Secret name is required'),
  value: z.string().min(1, 'Secret value is required'),
})

const editSecretSchema = z.object({
  key: z.string().optional(),
  value: z.string().min(1, 'Secret value is required'),
})

type SecretFormData = z.infer<typeof createSecretSchema>

interface SecretFormProps {
  form: UseFormReturn<SecretFormData>
  isEditMode: boolean
  onSubmit: (data: SecretFormData) => void
  onCancel: () => void
  secretKey?: string
}

interface SecretDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  secretKey?: string
  onSubmit: (data: SecretFormData) => void
}

export function DialogFormSecret({
  isOpen,
  onOpenChange,
  secretKey,
  onSubmit,
}: SecretDialogProps) {
  const isEditMode = !!secretKey
  const schema = isEditMode ? editSecretSchema : createSecretSchema
  const form = useForm<SecretFormData>({
    resolver: zodV4Resolver(schema),
    defaultValues: {
      key: secretKey ?? '',
      value: '',
    },
  })

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  const handleSubmit = (data: SecretFormData) => {
    onSubmit(data)
    form.reset()
    onOpenChange(false)
  }

  const title = secretKey ? 'Update secret' : 'Add a secret'

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {secretKey
              ? 'Update the secret value below.'
              : 'Enter a name and value for the new secret.'}
          </DialogDescription>
        </DialogHeader>

        <SecretForm
          form={form}
          isEditMode={isEditMode}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          secretKey={secretKey}
        />
      </DialogContent>
    </Dialog>
  )
}

function SecretForm({
  form,
  isEditMode,
  onSubmit,
  onCancel,
  secretKey,
}: SecretFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const secretContentsLabel = isEditMode ? 'New value' : 'Secret value'
  const submitButtonText = isEditMode ? 'Update' : 'Save'

  const handleFormSubmit = (data: SecretFormData) => {
    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        <div className="space-y-4 pt-4 pb-8">
          <FormField
            control={form.control}
            name="key"
            render={({ field }) => (
              <FormItem>
                <FormLabel readOnly={isEditMode}>Secret name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Name"
                    {...field}
                    value={isEditMode ? secretKey : field.value}
                    readOnly={isEditMode}
                    disabled={isEditMode}
                  />
                </FormControl>
                {!isEditMode && <FormMessage />}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{secretContentsLabel}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      className="pr-10"
                      placeholder="Secret"
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-0 right-0 h-full px-3 py-2
                        hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="text-muted-foreground size-4" />
                      ) : (
                        <Eye className="text-muted-foreground size-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button variant="action" className="rounded-full" type="submit">
            {submitButtonText}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
