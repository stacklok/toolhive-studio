import {
  useRef,
  useCallback,
  type ReactNode,
  type ChangeEventHandler,
} from 'react'
import { Button } from '@/common/components/ui/button'
import { InfoIcon, Plus, Trash2 } from 'lucide-react'
import {
  useFieldArray,
  type FieldValues,
  type ArrayPath,
  type Path,
  type ControllerRenderProps,
  type UseFormReturn,
  type Control,
} from 'react-hook-form'
import {
  FormDescription,
  FormField,
  FormLabel,
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
  description?: string
  tooltipContent?: string
  addButtonText?: string
  form: UseFormReturn<TFieldValues>
  children: (args: {
    idx: number
    fieldProps: {
      control: Control<TFieldValues>
      name: Path<TFieldValues>
    }
    setInputRef: (idx: number) => (el: HTMLInputElement | null) => void
    inputProps: {
      id: string
      onChange: ChangeEventHandler
    }
    message: ReactNode
  }) => ReactNode
}

export function DynamicArrayField<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  tooltipContent,
  inputLabelPrefix = 'Item',
  addButtonText = 'Add',
  form,
  children,
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
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <FormLabel htmlFor={`${name}-0`}>{label}</FormLabel>
          {tooltipContent && (
            <Tooltip>
              <TooltipTrigger asChild autoFocus={false}>
                <InfoIcon className="text-muted-foreground size-4 rounded-full" />
              </TooltipTrigger>
              <TooltipContent>{tooltipContent}</TooltipContent>
            </Tooltip>
          )}
        </div>
        {description && <FormDescription>{description}</FormDescription>}
      </div>

      <div className="mt-3 flex flex-col gap-2">
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
                <>
                  {children({
                    fieldProps: {
                      control,
                      name: `${name}.${idx}.value` as Path<TFieldValues>,
                    },
                    idx,
                    setInputRef,
                    inputProps: {
                      id: `${name}-${idx}`,
                      onChange: async (e) => {
                        field.onChange(e)

                        // There is an issue with react-hook-form about error validation for array fields
                        // take a look to the PR for detail https://github.com/stacklok/toolhive-studio/pull/664
                        await resetValidation(idx)
                      },
                    },
                    message: isInvalid(idx) && <FormMessage />,
                  })}
                </>
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
          <Plus />
          {addButtonText}
        </Button>
      </div>
    </div>
  )
}
