import { Form } from "@/common/components/ui/form";
import {
  formSchemaRunMcpCommand,
  type FormSchemaRunMcpCommand,
} from "../lib/form-schema-run-mcp-server-with-command";
import { useForm } from "react-hook-form";

import { FormFieldsRunMcpCommand } from "./form-fields-run-mcp-command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Button } from "@/common/components/ui/button";
import type { V1CreateRequest } from "@/common/api/generated";
import { zodV4Resolver } from "@/common/lib/zod-v4-resolver";
import { FormFieldsArrayCustomEnvVars } from "./form-fields-array-custom-env-vars";

function mapEnvVars(envVars: { key: string; value: string }[]) {
  return envVars.map((envVar) => `${envVar.key}=${envVar.value}`);
}

const transformTypeSpecificData = (
  values: FormSchemaRunMcpCommand,
): V1CreateRequest => {
  const type = values.type;
  switch (type) {
    case "docker_image": {
      return {
        name: values.name,
        transport: values.transport,
        image: values.image,
      };
    }
    case "package_manager": {
      return {
        name: values.name,
        transport: values.transport,
        image: `${values.protocol}://${values.package_name}`,
      };
    }
    default:
      return type satisfies never;
  }
};

const transformData = (values: FormSchemaRunMcpCommand): V1CreateRequest => {
  const data = transformTypeSpecificData(values);

  if (values.cmd_arguments != null) {
    data.cmd_arguments = values.cmd_arguments.split(" ");
  }

  if (
    Array.isArray(values.environment_variables) &&
    values.environment_variables.length > 0
  ) {
    data.env_vars = mapEnvVars(values.environment_variables);
  }

  return data;
};

export function DialogFormRunMcpServerWithCommand({
  onSubmit,
  isOpen,
  onOpenChange,
}: {
  onSubmit: (data: V1CreateRequest) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<FormSchemaRunMcpCommand>({
    resolver: zodV4Resolver(formSchemaRunMcpCommand),
    defaultValues: {
      type: "docker_image",
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              onSubmit(transformData(data as FormSchemaRunMcpCommand));
              onOpenChange(false);
            })}
          >
            <DialogHeader className="p-6 mb-4">
              <DialogTitle>Custom MCP server</DialogTitle>
              <DialogDescription>
                ToolHive allows you to securely run a custom MCP server from a
                Docker image or a package manager command.
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 max-h-[65dvh] space-y-4 overflow-y-auto relative">
              <FormFieldsRunMcpCommand form={form} />

              <FormFieldsArrayCustomEnvVars form={form} />
            </div>

            <DialogFooter className="p-6">
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
