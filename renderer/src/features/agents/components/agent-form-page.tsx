import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import z from 'zod/v4'
import { ArrowLeft, Check, Eye, Pencil, Wrench, X } from 'lucide-react'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { mermaid } from '@streamdown/mermaid'
import { cjk } from '@streamdown/cjk'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Textarea } from '@/common/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/components/ui/form'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { STREAMDOWN_PROSE_CLASS } from '@/common/lib/streamdown-prose'
import { cn } from '@/common/lib/utils'
import { trackEvent } from '@/common/lib/analytics'
import { useCreateAgent, useUpdateAgent } from '../hooks/use-agents'
import {
  ModelPicker,
  type ModelSelection,
} from '../../chat/components/model-picker'
import {
  BUILTIN_TOOL_BUNDLES,
  type AgentConfig,
  type BuiltinToolsKey,
} from '../../../../../main/src/chat/agents/types'

const STREAMDOWN_PLUGINS = { code, mermaid, cjk }

type InstructionsMode = 'edit' | 'preview'

const modelSelectionSchema = z
  .object({
    provider: z.string(),
    model: z.string(),
  })
  .nullable()

const builtinToolsKeySchema = z
  .enum(
    BUILTIN_TOOL_BUNDLES.map((bundle) => bundle.key) as [
      BuiltinToolsKey,
      ...BuiltinToolsKey[],
    ]
  )
  .nullable()

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Name is too long'),
  description: z.string().max(200, 'Description is too long').optional(),
  instructions: z.string().min(1, 'Instructions are required'),
  defaultModel: modelSelectionSchema.optional(),
  builtinToolsKey: builtinToolsKeySchema.optional(),
})

type FormSchema = z.infer<typeof formSchema>

interface AgentFormPageProps {
  mode: 'create' | 'edit'
  agent?: AgentConfig
}

export function AgentFormPage({ mode, agent }: AgentFormPageProps) {
  const navigate = useNavigate()
  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()
  const [instructionsMode, setInstructionsMode] =
    useState<InstructionsMode>('edit')

  const isEdit = mode === 'edit'

  const form = useForm<FormSchema>({
    resolver: zodV4Resolver(formSchema),
    defaultValues: {
      name: agent?.name ?? '',
      description: agent?.description ?? '',
      instructions: agent?.instructions ?? '',
      defaultModel: agent?.defaultModel ?? null,
      builtinToolsKey: agent?.builtinToolsKey ?? null,
    },
  })

  const handleCancel = () => {
    if (isEdit && agent) {
      void navigate({
        to: '/playground/agents/$agentId',
        params: { agentId: agent.id },
      })
    } else {
      void navigate({ to: '/playground/agents' })
    }
  }

  const handleSubmit = async (values: FormSchema) => {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() ?? '',
      instructions: values.instructions,
      defaultModel: values.defaultModel ?? null,
      builtinToolsKey: values.builtinToolsKey ?? null,
    }

    try {
      if (isEdit && agent) {
        await updateAgent.mutateAsync({ id: agent.id, input: payload })
        trackEvent('Agents: update', { agent_id: agent.id })
        toast.success(`Updated "${payload.name}"`)
        void navigate({
          to: '/playground/agents/$agentId',
          params: { agentId: agent.id },
        })
      } else {
        const created = await createAgent.mutateAsync(payload)
        trackEvent('Agents: create', { agent_id: created.id })
        toast.success(`Created "${created.name}"`)
        void navigate({
          to: '/playground/agents/$agentId',
          params: { agentId: created.id },
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to save agent: ${message}`)
    }
  }

  const isPending = createAgent.isPending || updateAgent.isPending
  const backTo = isEdit && agent ? undefined : '/playground/agents'

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mx-auto w-full max-w-4xl p-6 pb-28"
      >
        <div className="mb-6">
          {backTo ? (
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
              <LinkViewTransition to={backTo}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to agents
              </LinkViewTransition>
            </Button>
          ) : agent ? (
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
              <LinkViewTransition
                to="/playground/agents/$agentId"
                params={{ agentId: agent.id }}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to {agent.name}
              </LinkViewTransition>
            </Button>
          ) : null}
          <h1 className="text-2xl font-semibold">
            {isEdit ? `Edit ${agent?.name ?? 'agent'}` : 'New agent'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Give your agent a name, a description, and the instructions it
            should follow in every chat.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Release Assistant" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="defaultModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default model (optional)</FormLabel>
                <FormControl>
                  <ModelPicker
                    value={field.value ?? null}
                    onChange={(next: ModelSelection) => field.onChange(next)}
                    onClear={() => field.onChange(null)}
                    placeholder="No default model"
                    triggerClassName="border-input bg-background hover:bg-accent
                      h-9 w-full justify-between rounded-md border px-3"
                    data-testid="agent-default-model"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="mb-6">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input
                  placeholder="Short summary shown in the agent picker."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem className="mb-6">
              <div className="flex items-center justify-between">
                <FormLabel>Instructions (system prompt)</FormLabel>
                <InstructionsModeToggle
                  value={instructionsMode}
                  onChange={setInstructionsMode}
                />
              </div>
              {instructionsMode === 'edit' ? (
                <FormControl>
                  <Textarea
                    placeholder="You are a helpful assistant that..."
                    className="h-[60vh] min-h-[360px] resize-y font-mono
                      text-sm"
                    {...field}
                  />
                </FormControl>
              ) : (
                <div
                  className="border-input bg-background h-[60vh] min-h-[360px]
                    overflow-y-auto rounded-md border p-4"
                >
                  {field.value.trim().length > 0 ? (
                    <Streamdown
                      plugins={STREAMDOWN_PLUGINS}
                      className={STREAMDOWN_PROSE_CLASS}
                    >
                      {field.value}
                    </Streamdown>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Nothing to preview yet. Switch back to Edit and write the
                      system prompt.
                    </p>
                  )}
                </div>
              )}
              <FormDescription>
                These instructions are sent as the system prompt on every chat
                turn. Supports Markdown.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="builtinToolsKey"
          render={({ field }) => (
            <FormItem className="mt-6">
              <FormLabel>Built-in tools (optional)</FormLabel>
              <FormControl>
                <BuiltinToolsBundlePicker
                  value={field.value ?? null}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Give this agent access to a curated bundle of ToolHive-provided
                tools. Leave unselected to use only MCP tools enabled in the
                chat.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div
          className="bg-background/95 sticky bottom-0 mt-6 flex items-center
            justify-end gap-3 border-t py-4 backdrop-blur"
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isEdit ? 'Save changes' : 'Create agent'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function BuiltinToolsBundlePicker({
  value,
  onChange,
}: {
  value: BuiltinToolsKey | null
  onChange: (next: BuiltinToolsKey | null) => void
}) {
  if (BUILTIN_TOOL_BUNDLES.length === 0) return null
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {BUILTIN_TOOL_BUNDLES.map(({ key, label, description }) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            role="checkbox"
            aria-checked={active}
            onClick={() => onChange(active ? null : key)}
            data-testid={`builtin-tools-${key}`}
            className={cn(
              `group border-input bg-background hover:bg-accent/40 relative flex
              items-start gap-3 rounded-md border p-3 text-left
              transition-colors`,
              active && 'border-primary bg-accent/30'
            )}
          >
            <div
              className={cn(
                `bg-muted text-muted-foreground flex h-8 w-8 shrink-0
                items-center justify-center rounded-md`,
                active && 'bg-primary text-primary-foreground'
              )}
            >
              <Wrench className="h-4 w-4" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{label}</span>
                <span
                  className={cn(
                    `text-muted-foreground flex h-4 w-4 items-center
                    justify-center`,
                    active && 'text-primary'
                  )}
                >
                  {active ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-3 w-3 opacity-40" />
                  )}
                </span>
              </div>
              <p className="text-muted-foreground text-xs leading-5">
                {description}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function InstructionsModeToggle({
  value,
  onChange,
}: {
  value: InstructionsMode
  onChange: (next: InstructionsMode) => void
}) {
  const options: { id: InstructionsMode; label: string; Icon: typeof Eye }[] = [
    { id: 'edit', label: 'Edit', Icon: Pencil },
    { id: 'preview', label: 'Preview', Icon: Eye },
  ]
  return (
    <div
      role="tablist"
      aria-label="Instructions view mode"
      className="bg-muted inline-flex items-center gap-1 rounded-md p-0.5"
    >
      {options.map(({ id, label, Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              `flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs
              font-medium transition-colors`,
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
