import React, { useState } from 'react'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { Trash2 } from 'lucide-react'

interface DynamicArrayFieldProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  inputLabelPrefix?: string
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  addButtonText?: string
  validate?: (value: string) => string | null
}

export const DynamicArrayField: React.FC<DynamicArrayFieldProps> = ({
  label,
  value,
  onChange,
  inputLabelPrefix = 'Item',
  inputProps = {},
  addButtonText = 'Add',
  validate,
}) => {
  const [touched, setTouched] = useState<boolean[]>(value.map(() => false))

  // Update touched state if value length changes
  React.useEffect(() => {
    setTouched((t) => {
      if (value.length > t.length)
        return [...t, ...Array(value.length - t.length).fill(false)]
      if (value.length < t.length) return t.slice(0, value.length)
      return t
    })
  }, [value.length])

  return (
    <div className="mt-6 w-full">
      <Label>{label}</Label>
      <div role="group" aria-label={label} className="w-full">
        {Array.isArray(value) && value.length > 0 && (
          <div className="mt-2 flex w-full flex-col gap-2">
            {value.map((item, idx) => {
              const error = validate ? validate(item) : null
              return (
                <div key={idx} className="flex w-full flex-col gap-1">
                  <div className="flex w-full items-center gap-2">
                    <Input
                      type="text"
                      aria-label={`${inputLabelPrefix} ${idx + 1}`}
                      value={item}
                      onChange={(e) => {
                        const newArr = [...value]
                        newArr[idx] = e.target.value
                        onChange(newArr)
                      }}
                      onBlur={() => {
                        setTouched((t) => {
                          const arr = [...t]
                          arr[idx] = true
                          return arr
                        })
                      }}
                      className="w-32 grow"
                      {...inputProps}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Remove ${inputLabelPrefix} ${idx + 1}`}
                      onClick={() => {
                        const newArr = value.filter((_, i) => i !== idx)
                        onChange(newArr)
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  {touched[idx] && error && (
                    <span className="text-xs text-red-500">{error}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          className="mt-2"
          onClick={() => onChange([...(value || []), ''])}
        >
          {addButtonText}
        </Button>
      </div>
    </div>
  )
}
