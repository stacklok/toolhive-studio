import React  from 'react'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { Trash2 } from 'lucide-react'
import {
  useFieldArray,
  type Control,
  type FieldValues,
  Controller,
  type Path,
} from "react-hook-form";

interface DynamicArrayFieldProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;            
  label: string;
  inputLabelPrefix?: string;
  addButtonText?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}


export function DynamicArrayField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  inputLabelPrefix = "Item",
  addButtonText = "Add",
  inputProps = {},
}: DynamicArrayFieldProps<TFieldValues>) {
  const { fields, append, remove } = useFieldArray<TFieldValues>({
    control,
    name,
  });

  return (
    <div className="mt-6 w-full">
      <Label>{label}</Label>

      <div className="flex flex-col gap-2 mt-2">
        {fields.map((field, idx) => (
          <div key={field.id} className="flex items-start gap-2">
            <Controller
              control={control}
              name={`${name}.${idx}` as Path<TFieldValues>}
              render={({ field }) => (
                <Input
                  {...field}
                  aria-label={`${inputLabelPrefix} ${idx + 1}`}
                  className="w-32 grow"
                  {...inputProps}
                />
              )}
            />

            <Button
              type="button"
              variant="outline"
              aria-label={`Remove ${inputLabelPrefix} ${idx + 1}`}
              onClick={() => remove(idx)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="secondary"
          className="mt-1 w-fit"
          onClick={() => append("")}          // append an empty string
        >
          {addButtonText}
        </Button>
      </div>
    </div>
  );
}
