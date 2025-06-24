import { Form } from '@/common/components/ui/form'
import {
  getFormSchemaRunMcpCommand,
  type FormSchemaRunMcpCommand,
} from '../lib/form-schema-run-mcp-server-with-command'
import { useForm } from 'react-hook-form'

import { FormFieldsRunMcpCommand } from './form-fields-run-mcp-command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { FormFieldsArrayCustomEnvVars } from './form-fields-array-custom-env-vars'
import { FormFieldsArrayCustomSecrets } from './form-fields-array-custom-secrets'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@/common/api/generated/@tanstack/react-query.gen'

export function DialogFormRunMcpServerWithCommand({
  onSubmit,
  isOpen,
  onOpenChange,
}: {
  onSubmit: (data: FormSchemaRunMcpCommand) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
  })

  const workloads = data?.workloads ?? []

  const form = useForm<FormSchemaRunMcpCommand>({
    resolver: zodV4Resolver(getFormSchemaRunMcpCommand(workloads)),
    defaultValues: {
      type: 'docker_image',
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 sm:max-w-2xl"
        onInteractOutside={(e) => {
          // Prevent closing the dialog when clicking outside
          e.preventDefault()
        }}
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              onSubmit(data)
              form.reset()
              onOpenChange(false)
            })}
          >
            <DialogHeader className="mb-4 p-6">
              <DialogTitle>Custom MCP server</DialogTitle>
              <DialogDescription>
                ToolHive allows you to securely run a custom MCP server from a
                Docker image or a package manager command.
              </DialogDescription>
            </DialogHeader>

            <div className="relative max-h-[65dvh] space-y-4 overflow-y-auto px-6">
              <FormFieldsRunMcpCommand form={form} />
              <FormFieldsArrayCustomSecrets form={form} />
              <FormFieldsArrayCustomEnvVars form={form} />
            </div>

            <DialogFooter className="p-6">
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
