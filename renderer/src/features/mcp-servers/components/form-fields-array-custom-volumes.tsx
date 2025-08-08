import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/common/components/ui/form'
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
      <FormLabel>Storage volumes</FormLabel>
      <FormDescription>
        Provide the MCP server access to a local folder. Optionally specific
        individual files.
      </FormDescription>
      <Controller
        control={form.control}
        name="volumes"
        render={() => (
          <DynamicArrayField<FormSchemaRunMcpCommand>
            name="volumes"
            label="Volumes"
            inputLabelPrefix="Volume"
            addButtonText="Add a volume"
            tooltipContent="Specify the path to the volume"
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
                              aria-label={`Volume ${idx + 1} - Host path`}
                              name={`volumes.${idx}.host`}
                              value={volumeValue?.host || ''}
                              onChange={(e) =>
                                field.onChange({
                                  host: e.target.value,
                                  container: volumeValue.container || '',
                                  accessMode: volumeValue.accessMode,
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
                              aria-label={`Volume ${idx + 1} - Container path`}
                              name={`volumes.${idx}.container`}
                              value={volumeValue?.container || ''}
                              onChange={(e) =>
                                field.onChange({
                                  host: volumeValue.host || '',
                                  container: e.target.value,
                                  accessMode: volumeValue.accessMode,
                                })
                              }
                              placeholder="Container path"
                            />
                          </FormControl>
                          <FormControl className="w-48 flex-shrink-0">
                            <Select
                              onValueChange={(value) =>
                                field.onChange({
                                  host: volumeValue.host || '',
                                  container: volumeValue.container || '',
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
