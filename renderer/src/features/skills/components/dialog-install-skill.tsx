import { useForm, useWatch } from 'react-hook-form'
import z from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaDiscoveryClientsOptions } from '@common/api/generated/@tanstack/react-query.gen'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'
import { FolderOpenIcon } from 'lucide-react'
import { useMutationInstallSkill } from '../hooks/use-mutation-install-skill'

const formSchema = z
  .object({
    name: z.string().min(1, 'Name or reference is required'),
    scope: z.enum(['user', 'project']),
    project_root: z.string().optional(),
    client: z.string().optional(),
    version: z.string().optional(),
  })
  .check((ctx) => {
    if (ctx.value.scope === 'project' && !ctx.value.project_root?.trim()) {
      ctx.issues.push({
        code: 'custom',
        path: ['project_root'],
        message: 'Project root is required for project scope',
        input: ctx.value,
      })
    }
  })

type FormSchema = z.infer<typeof formSchema>

interface DialogInstallSkillProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultReference?: string
}

export function DialogInstallSkill({
  open,
  onOpenChange,
  defaultReference,
}: DialogInstallSkillProps) {
  const { mutateAsync: installSkill, isPending } = useMutationInstallSkill()

  const { data: clientsData } = useQuery(getApiV1BetaDiscoveryClientsOptions())
  const installedClients = (
    clientsData?.clients?.filter((c) => c.installed && c.client_type) ?? []
  ).sort((a, b) => a.client_type!.localeCompare(b.client_type!))

  const form = useForm<FormSchema>({
    resolver: zodV4Resolver(formSchema),
    defaultValues: {
      name: defaultReference ?? '',
      scope: 'user',
      project_root: '',
      client: '',
      version: '',
    },
  })

  const scope = useWatch({ control: form.control, name: 'scope' })

  function handleClose() {
    form.reset()
    onOpenChange(false)
  }

  async function handleBrowseProjectRoot() {
    const selected = await window.electronAPI.selectFolder()
    if (selected) {
      form.setValue('project_root', selected, { shouldValidate: true })
    }
  }

  async function onSubmit(values: FormSchema) {
    await installSkill({
      body: {
        name: values.name,
        scope: values.scope,
        project_root:
          values.scope === 'project' ? values.project_root : undefined,
        client: values.client || undefined,
        version: values.version || undefined,
      },
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Install skill</DialogTitle>
          <DialogDescription>
            Install a skill by providing its name or OCI reference.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name or reference</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. your-org/your-skill"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      if (v === 'user') {
                        form.setValue('project_root', '')
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {scope === 'project' && (
              <FormField
                control={form.control}
                name="project_root"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project root</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Select project folder..."
                          readOnly
                          className="cursor-default"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={handleBrowseProjectRoot}
                        aria-label="Browse for project folder"
                      >
                        <FolderOpenIcon className="size-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Client{' '}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FormLabel>
                  {installedClients.length > 0 ? (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {installedClients.map((c) => (
                          <SelectItem
                            key={c.client_type}
                            value={c.client_type!}
                          >
                            {c.client_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl>
                      <Input {...field} placeholder="e.g. claude-code" />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Version{' '}
                    <span className="text-muted-foreground font-normal">
                      (optional, defaults to latest)
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
                {isPending ? 'Installing...' : 'Install'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
