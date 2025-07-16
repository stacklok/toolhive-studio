import React from 'react'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { InfoIcon, Trash2 } from 'lucide-react'
import {
  useFieldArray,
  type Control,
  type FieldValues,
  type ArrayPath,
  type Path,
  type ControllerRenderProps,
} from 'react-hook-form'
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from '@/common/components/ui/form'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/common/components/ui/tooltip'

interface DynamicArrayFieldProps<
  TFieldValues extends FieldValues = FieldValues,
> {
  control: Control<TFieldValues>
  name: ArrayPath<TFieldValues>
  label: string
  inputLabelPrefix?: string
  tooltipContent?: string
  addButtonText?: string
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}

export function DynamicArrayField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  tooltipContent,
  inputLabelPrefix = 'Item',
  addButtonText = 'Add',
  inputProps = {},
}: DynamicArrayFieldProps<TFieldValues>) {
  const { fields, append, remove } = useFieldArray<
    TFieldValues,
    ArrayPath<TFieldValues>
  >({
    control,
    name,
  })

  return (
    <div className="mt-6 w-full">
      <div className="flex items-center gap-2">
        <Label htmlFor={`${name}-0`}>{label}</Label>
        {tooltipContent && (
          <Tooltip>
            <TooltipTrigger asChild autoFocus={false}>
              <InfoIcon className="text-muted-foreground size-4 rounded-full" />
            </TooltipTrigger>
            <TooltipContent>{tooltipContent}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {fields.map((field, idx) => (
          <div key={field.id} className="flex items-start gap-2">
            <FormField
              control={control}
              name={`${name}.${idx}` as Path<TFieldValues>}
              render={({
                field,
              }: {
                field: ControllerRenderProps<TFieldValues, Path<TFieldValues>>
              }) => (
                <FormItem className="flex-grow">
                  <FormControl className="w-full">
                    <Input
                      {...field}
                      id={`${name}-${idx}`}
                      aria-label={`${inputLabelPrefix} ${idx + 1}`}
                      className="min-w-0 grow"
                      {...inputProps}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
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
          onClick={() => {
            // @ts-expect-error no time to fix it
            append('')
          }}
        >
          {addButtonText}
        </Button>
      </div>
    </div>
  )
}
