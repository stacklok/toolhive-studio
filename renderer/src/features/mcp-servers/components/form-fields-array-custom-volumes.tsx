import { FormControl, FormField, FormItem } from '@/common/components/ui/form'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Input } from '@/common/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@/common/components/ui/select'
import { FolderCheck, FolderLock } from 'lucide-react'
import type { FormSchemaRunMcpCommand } from '../lib/form-schema-run-mcp-server-with-command'
import { DynamicArrayField } from '@/features/registry-servers/components/dynamic-array-field'

type AccessMode = 'ro' | 'rw'
type Volume = {
  host?: string
  container?: string
  accessMode?: AccessMode
}

const getAccessModeDisplay = (value: Volume['accessMode'] | undefined) => {
  switch (value) {
    case 'ro':
      return <FolderLock className="size-4" />
    case 'rw':
    default:
      return <FolderCheck className="size-4" />
  }
}

export function FormFieldsArrayCustomVolumes({
  form,
}: {
  form: UseFormReturn<FormSchemaRunMcpCommand>
}) {
  return (
    <FormItem className="mb-10">
      <Controller
        control={form.control}
        name="volumes"
        render={() => (
          <DynamicArrayField<FormSchemaRunMcpCommand>
            name="volumes"
            label="Storage volumes"
            inputLabelPrefix="Storage volume"
            addButtonText="Add a volume"
            description="Provide the MCP server access to a local folder. Optionally specific individual files."
            form={form}
          >
            {({ inputProps, setInputRef, idx }) => (
              <FormField
                control={form.control}
                name={`volumes.${idx}`}
                render={({ field }) => {
                  const volumeValue = field.value as Volume

                  return (
                    <>
                      <FormItem className="flex-grow">
                        <div className="flex w-full gap-2">
                          <FormControl className="flex-1">
                            <Input
                              {...inputProps}
                              type="string"
                              ref={setInputRef(idx)}
                              aria-label={`Host path ${idx + 1}`}
                              name={`volumes.${idx}.host`}
                              value={volumeValue?.host || ''}
                              onChange={(e) =>
                                field.onChange({
                                  ...volumeValue,
                                  host: e.target.value,
                                })
                              }
                              placeholder="Host path"
                            />
                          </FormControl>
                          <FormControl className="flex-1">
                            <Input
                              {...inputProps}
                              type="string"
                              ref={setInputRef(idx)}
                              aria-label={`Container path ${idx + 1}`}
                              name={`volumes.${idx}.container`}
                              value={volumeValue?.container || ''}
                              onChange={(e) =>
                                field.onChange({
                                  ...volumeValue,
                                  container: e.target.value,
                                })
                              }
                              placeholder="Container path"
                            />
                          </FormControl>
                          <FormControl className="w-48 flex-shrink-0">
                            <Select
                              onValueChange={(value) =>
                                field.onChange({
                                  ...volumeValue,
                                  accessMode: value as AccessMode,
                                })
                              }
                              value={volumeValue.accessMode}
                            >
                              <SelectTrigger>
                                {getAccessModeDisplay(volumeValue.accessMode)}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ro">
                                  <div className="flex items-center gap-2">
                                    <FolderLock className="size-4" />
                                    <span>Read only access</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="rw">
                                  <div className="flex items-center gap-2">
                                    <FolderCheck className="size-4" />
                                    <span>Read & write access</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </div>
                      </FormItem>
                    </>
                  )
                }}
              />
            )}
          </DynamicArrayField>
        )}
      />
    </FormItem>
  )
}
