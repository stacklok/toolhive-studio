import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import z from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaDiscoveryClientsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { Alert, AlertDescription } from '@/common/components/ui/alert'
import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu'
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
  FormDescription,
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
import { ChevronDown, FolderOpenIcon, TriangleAlertIcon } from 'lucide-react'
import { useMutationInstallSkill } from '../hooks/use-mutation-install-skill'

const formSchema = z
  .object({
    name: z.string().min(1, 'Name or reference is required'),
    scope: z.enum(['user', 'project']),
    project_root: z.string().optional(),
    clients: z.array(z.string()).optional(),
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
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: clientsData, isLoading: isLoadingClients } = useQuery({
    ...getApiV1BetaDiscoveryClientsOptions(),
    enabled: open,
  })
  const installedClients = (
    clientsData?.clients?.filter(
      (c) => c.installed && c.client_type && c.supports_skills
    ) ?? []
  ).sort((a, b) => a.client_type!.localeCompare(b.client_type!))

  const form = useForm<FormSchema>({
    resolver: zodV4Resolver(formSchema),
    defaultValues: {
      name: defaultReference ?? '',
      scope: 'user',
      project_root: '',
      clients: [],
      version: '',
    },
  })

  const scope = useWatch({ control: form.control, name: 'scope' })

  function handleClose() {
    form.reset()
    setSubmitError(null)
    onOpenChange(false)
  }

  async function handleBrowseProjectRoot() {
    const selected = await window.electronAPI.selectFolder()
    if (selected) {
      form.setValue('project_root', selected, { shouldValidate: true })
    }
  }

  async function onSubmit(values: FormSchema) {
    setSubmitError(null)
    try {
      await installSkill({
        body: {
          name: values.name,
          scope: values.scope,
          project_root:
            values.scope === 'project' ? values.project_root : undefined,
          clients: values.clients?.length ? values.clients : undefined,
          version: values.version || undefined,
        },
      })
      handleClose()
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'error' in err
            ? String((err as { error: unknown }).error)
            : typeof err === 'string'
              ? err
              : 'Failed to install skill'
      setSubmitError(message)
    }
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
        {submitError && (
          <Alert variant="destructive">
            <TriangleAlertIcon className="size-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}
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
              name="clients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Clients{' '}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FormLabel>
                  {installedClients.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between font-normal"
                          aria-label="Select clients"
                        >
                          <span className="truncate">
                            {field.value?.length
                              ? field.value.join(', ')
                              : 'All detected clients'}
                          </span>
                          <ChevronDown className="size-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width)"
                        align="start"
                      >
                        {installedClients.map((c) => {
                          const clientType = c.client_type!
                          return (
                            <DropdownMenuCheckboxItem
                              key={clientType}
                              checked={
                                field.value?.includes(clientType) ?? false
                              }
                              onCheckedChange={(isChecked) => {
                                const current = field.value ?? []
                                field.onChange(
                                  isChecked
                                    ? [...current, clientType]
                                    : current.filter((v) => v !== clientType)
                                )
                              }}
                              onSelect={(e) => e.preventDefault()}
                            >
                              {clientType}
                            </DropdownMenuCheckboxItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : !isLoadingClients ? (
                    <p className="text-muted-foreground text-sm">
                      No skill-supporting clients detected — will install for
                      all available clients
                    </p>
                  ) : null}
                  <FormDescription>
                    Leave empty to install for all detected clients
                  </FormDescription>
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
