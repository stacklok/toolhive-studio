import React, { useState, useRef } from 'react'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import { X } from 'lucide-react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/common/components/ui/form'
import { cn } from '@/common/lib/utils'
import type { UseFormReturn } from 'react-hook-form'
import type { FormSchemaRunFromRegistry } from '../lib/get-form-schema-run-from-registry'
import { Input } from '@/common/components/ui/input'

interface CommandArgumentsFieldProps {
  form: UseFormReturn<FormSchemaRunFromRegistry>
}

export function CommandArgumentsField({ form }: CommandArgumentsFieldProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const cmd_arguments = form.formState.defaultValues?.cmd_arguments

  const addArgument = () => {
    if (inputValue.trim()) {
      const currentArgs = form.getValues('cmd_arguments') || []
      form.setValue('cmd_arguments', [...currentArgs, inputValue.trim()])
      setInputValue('')
    }
  }

  const removeArgument = (index: number) => {
    const currentArgs = form.getValues('cmd_arguments') || []
    const newArgs = currentArgs.filter((_, i) => i !== index)
    form.setValue('cmd_arguments', newArgs)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      addArgument()
    }
  }

  return (
    <FormField
      control={form.control}
      name="cmd_arguments"
      render={({ field }) => (
        <FormItem className="mb-10">
          <FormLabel htmlFor={`${field.name}-input`}>
            Command arguments
          </FormLabel>
          <FormDescription
            id={`${field.name}-description`}
            className="flex items-center gap-1"
          >
            Add individual arguments for the command
          </FormDescription>
          <FormControl>
            <div
              className={cn(
                `border-input flex min-h-9 w-full cursor-text flex-wrap
                items-center gap-1 rounded-md border bg-transparent px-3 py-1
                text-sm transition-[color,box-shadow]`,
                `aria-invalid:ring-destructive/20
                dark:aria-invalid:ring-destructive/40
                aria-invalid:border-destructive`
              )}
              onClick={() => {
                inputRef.current?.focus()
              }}
            >
              {field.value && field.value.length > 0 && (
                <>
                  {field.value.map((arg, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className={cn(
                        'flex h-6 items-center gap-1 px-2 font-mono text-xs',
                        cmd_arguments?.includes(arg) &&
                          'cursor-not-allowed opacity-40'
                      )}
                    >
                      {arg}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={cmd_arguments?.includes(arg)}
                        className="hover:text-muted-foreground/80 ml-1 size-3
                          p-1 hover:cursor-pointer disabled:cursor-not-allowed
                          disabled:opacity-40"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeArgument(index)
                        }}
                        aria-label={`Remove argument ${arg}`}
                      >
                        <X className="size-3" />
                      </Button>
                    </Badge>
                  ))}
                </>
              )}

              <Input
                ref={inputRef}
                id={`${field.name}-input`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => addArgument()}
                placeholder={
                  field.value && field.value.length > 0
                    ? 'Add argument...'
                    : 'e.g. --debug, --port, 8080'
                }
                className="placeholder:text-muted-foreground min-w-[120px]
                  flex-1 border-0 bg-transparent text-sm shadow-none
                  outline-none focus:ring-0 focus-visible:ring-0"
                autoComplete="off"
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
