import { Form } from "@/common/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
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

const transformData = (data: FormSchemaRunMcpCommand): V1CreateRequest => {
  switch (data.type) {
    case "docker_image": {
      return {
        name: data.name,
        transport: data.transport,
        image: data.image,
        cmd_arguments: data.cmd_arguments,
      };
    }
    case "package_manager": {
      return {
        name: data.name,
        transport: data.transport,
        image: `${data.protocol}://${data.package_name}`,
        cmd_arguments: data.cmd_arguments,
      };
    }
  }
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
    // Type instantiation is excessively deep and possibly infinite
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — there appears to be a bug with @hookform/resolvers/zod https://github.com/colinhacks/zod/issues/3987
    resolver: zodResolver(formSchemaRunMcpCommand),
    defaultValues: {
      type: "docker_image",
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              onSubmit(transformData(data));
              onOpenChange(false);
            })}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Custom MCP server</DialogTitle>
              <DialogDescription>
                ToolHive allows you to securely run a custom MCP server from a
                Docker image or a package manager command.
              </DialogDescription>
            </DialogHeader>
            <FormFieldsRunMcpCommand form={form} />

            <DialogFooter>
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
