import { useFieldArray, type UseFormReturn } from "react-hook-form";

import { PlusIcon, TrashIcon } from "lucide-react";
import type { FormSchemaRunMcpCommand } from "../lib/form-schema-run-mcp-server-with-command";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/ui/form";
import { TooltipInfoIcon } from "@/common/components/ui/tooltip-info-icon";
import { Input } from "@/common/components/ui/input";
import { Button } from "@/common/components/ui/button";

export function FormFieldsArrayCustomEnvVars({
  form,
}: {
  form: UseFormReturn<FormSchemaRunMcpCommand>;
}) {
  const { fields, append, remove } = useFieldArray<FormSchemaRunMcpCommand>({
    control: form.control,
    name: "environment_variables",
  });

  return (
    <>
      <div className="flex items-center gap-1">
        <FormLabel
          htmlFor={
            fields.length > 0
              ? "environment_variables.0.key"
              : "add-env-var-button"
          }
        >
          Environment variables
        </FormLabel>
        <TooltipInfoIcon>
          Environment variables are used to pass configuration settings to the
          server.
        </TooltipInfoIcon>
      </div>
      {fields.map((field, index) => (
        <div
          className="grid grid-cols-[auto_auto_calc(var(--spacing)_*_9)] gap-2"
          key={field.id}
        >
          <FormField
            control={form.control}
            name={`environment_variables.${index}.key`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    aria-label="Environment variable key"
                    defaultValue={field.value}
                    id={`environment_variables.${index}.key`}
                    name={field.name}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="e.g. API_KEY"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`environment_variables.${index}.value`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    aria-label="Environment variable value"
                    defaultValue={field.value}
                    name={field.name}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="e.g. 123_ABC_789_XZY"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            aria-label="Remove environment variable"
            type="button"
            variant="outline"
            onClick={() => remove(index)}
          >
            <TrashIcon />
          </Button>
        </div>
      ))}
      <Button
        id="add-env-var-button"
        type="button"
        variant="outline"
        className="w-full"
        aria-label="Add environment variable"
        onClick={() => append({ key: "", value: "" })}
      >
        <PlusIcon /> Add environment variable
      </Button>
    </>
  );
}
