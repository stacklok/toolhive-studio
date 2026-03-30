import { useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/components/ui/form'
import { FolderOpenIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useMutationBuildSkill } from '../hooks/use-mutation-build-skill'
import { DialogInstallSkill } from './dialog-install-skill'

const formSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  tag: z.string().optional(),
})

type FormSchema = z.infer<typeof formSchema>

interface DialogBuildSkillProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DialogBuildSkill({
  open,
  onOpenChange,
}: DialogBuildSkillProps) {
  const { mutateAsync: buildSkill, isPending } = useMutationBuildSkill()
  const [installOpen, setInstallOpen] = useState(false)
  const [builtReference, setBuiltReference] = useState<string | undefined>()

  const form = useForm<FormSchema>({
    resolver: zodV4Resolver(formSchema),
    defaultValues: {
      path: '',
      tag: '',
    },
  })

  function handleClose() {
    form.reset()
    onOpenChange(false)
  }

  async function handleBrowse() {
    const selected = await window.electronAPI.selectFolder()
    if (selected) {
      form.setValue('path', selected, { shouldValidate: true })
    }
  }

  async function onSubmit(values: FormSchema) {
    try {
      const result = await buildSkill({
        body: {
          path: values.path,
          tag: values.tag || undefined,
        },
      })

      const reference = result?.reference
      handleClose()

      if (reference) {
        setBuiltReference(reference)
        toast.success(`Skill built: ${reference}`, {
          duration: 10_000,
          closeButton: true,
          action: {
            label: 'Install now',
            onClick: () => setInstallOpen(true),
          },
        })
      } else {
        toast.success('Skill built successfully')
      }
    } catch {
      // Error toast is handled by useMutationBuildSkill onError
      // Keep the dialog open on failure
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Build skill</DialogTitle>
            <DialogDescription>
              Build a skill from a local directory on your computer.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-2"
            >
              <FormField
                control={form.control}
                name="path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Path</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Select a directory..."
                          readOnly
                          className="cursor-default"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={handleBrowse}
                        aria-label="Browse for folder"
                      >
                        <FolderOpenIcon className="size-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tag{' '}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. v1.0.0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="action" disabled={isPending}>
                  {isPending ? 'Building...' : 'Build'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DialogInstallSkill
        key={builtReference}
        open={installOpen}
        onOpenChange={setInstallOpen}
        defaultReference={builtReference}
      />
    </>
  )
}
