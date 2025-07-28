import React, { useRef, useCallback } from 'react'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { InfoIcon, Trash2 } from 'lucide-react'
import {
  useFieldArray,
  type FieldValues,
  type ArrayPath,
  type Path,
  type ControllerRenderProps,
  type UseFormReturn,
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
  name: ArrayPath<TFieldValues>
  label: string
  inputLabelPrefix?: string
  tooltipContent?: string
  addButtonText?: string
  type?: 'text' | 'number'
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  form: UseFormReturn<TFieldValues>
}

export function DynamicArrayField<TFieldValues extends FieldValues>({
  name,
  label,
  tooltipContent,
  inputLabelPrefix = 'Item',
  addButtonText = 'Add',
  type = 'text',
  inputProps = {},
  form,
}: DynamicArrayFieldProps<TFieldValues>) {
  const { control, formState } = form
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const { fields, append, remove } = useFieldArray<
    TFieldValues,
    ArrayPath<TFieldValues>
  >({
    control,
    name: name as ArrayPath<TFieldValues>,
  })

  const isInvalid = useCallback(
    (idx: number) => {
      return (
        formState.errors[`${name}.${idx}.value`] ||
        formState.errors[name as Path<TFieldValues>]
      )
    },
    [formState.errors, name]
  )

  const setInputRef = useCallback(
    (idx: number) => {
      return (el: HTMLInputElement | null) => {
        inputRefs.current[`${name}-${idx}`] = el
      }
    },
    [name]
  )

  const focusInput = useCallback(
    (idx: number) => {
      requestAnimationFrame(() => {
        const input = inputRefs.current[`${name}-${idx}`]
        if (input) {
          input.focus()
        }
      })
    },
    [name]
  )

  const resetValidation = useCallback(
    async (idx: number) => {
      const fieldName = `${name}.${idx}.value`
      const isValid = await form.trigger(fieldName as Path<TFieldValues>)
      if (isValid && form.formState.errors[fieldName]) {
        form.clearErrors(fieldName as Path<TFieldValues>)
        form.reset(form.getValues())
        await form.trigger()
        focusInput(idx)
      }
    },
    [focusInput, form, name]
  )

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
              name={`${name}.${idx}.value` as Path<TFieldValues>}
              render={({
                field,
              }: {
                field: ControllerRenderProps<TFieldValues, Path<TFieldValues>>
              }) => (
                <FormItem className="flex-grow">
                  <FormControl className="w-full">
                    <Input
                      {...field}
                      type={type}
                      ref={setInputRef(idx)}
                      id={`${name}-${idx}`}
                      aria-label={`${inputLabelPrefix} ${idx + 1}`}
                      className="min-w-0 grow"
                      {...inputProps}
                      onChange={async (e) => {
                        field.onChange(e)
                        await resetValidation(idx)
                      }}
                    />
                  </FormControl>
                  {isInvalid(idx) && <FormMessage />}
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
            append({
              value: '',
            } as TFieldValues[ArrayPath<TFieldValues>][number])
          }}
        >
          {addButtonText}
        </Button>
      </div>
    </div>
  )
}
