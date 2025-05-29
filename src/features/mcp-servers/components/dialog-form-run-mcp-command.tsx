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
import { useCallback } from "react";

const transformData = (data: FormSchemaRunMcpCommand): V1CreateRequest => {
  switch (data.command) {
    case "docker_run": {
      return {
        name: data.name,
        transport: data.transport,
        image: data.image,
      };
    }
    case "npx":
    case "uvx": {
      return {
        name: data.name,
        transport: data.transport,
        image: `${data.command}://${data.command}`,
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
    defaultValues: {},
  });

  const handleSubmit = useCallback(
    (data: FormSchemaRunMcpCommand) => {
      onSubmit(transformData(data));
      onOpenChange(false);
    },
    [onOpenChange, onSubmit],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            onError={(e) => {
              console.log(e);
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Run server with command</DialogTitle>
              <DialogDescription>
                ToolHive allows you to run an MCP server using an arbitrary
                command. We will containerize it, and run it securely for you.
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
