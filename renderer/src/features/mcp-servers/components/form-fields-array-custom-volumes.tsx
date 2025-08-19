import { FormControl, FormField, FormItem } from '@/common/components/ui/form'
import {
  Controller,
  type UseFormReturn,
  type FieldValues,
  type Path,
  type ArrayPath,
  type ControllerRenderProps,
} from 'react-hook-form'
import { Input } from '@/common/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@/common/components/ui/select'
import { FolderCheck, FolderLock } from 'lucide-react'
import { DynamicArrayField } from '@/features/registry-servers/components/dynamic-array-field'
import { FilePickerInput } from '@/common/components/ui/file-picker-input'

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

export function FormFieldsArrayVolumes<TForm extends FieldValues>({
  form,
}: {
  form: UseFormReturn<TForm>
}) {
  return (
    <FormItem className="mb-10">
      <Controller
        control={form.control}
        name={'volumes' as Path<TForm>}
        render={() => (
          <DynamicArrayField<TForm>
            name={'volumes' as ArrayPath<TForm>}
            label="Storage volumes"
            inputLabelPrefix="Storage volume"
            addButtonText="Add a volume"
            description="Provide the MCP server access to a local folder. Optionally specific individual files."
            form={form}
          >
            {({ inputProps, setInputRef, idx }) => (
              <FormField
                control={form.control}
                name={`volumes.${idx}` as Path<TForm>}
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<TForm, Path<TForm>>
                }) => {
                  const volumeValue = field.value as Volume

                  return (
                    <>
                      <FormControl className="flex-1">
                        <FilePickerInput
                          ref={setInputRef(idx)}
                          aria-label={`Host path ${idx + 1}`}
                          name={`volumes.${idx}.host` as Path<TForm>}
                          value={volumeValue?.host || ''}
                          placeholder="Host path"
                          onChange={({ newValue }) => {
                            field.onChange({
                              ...volumeValue,
                              host: newValue,
                            })
                          }}
                        />
                      </FormControl>
                      <FormControl className="flex-1">
                        <Input
                          {...inputProps}
                          type="string"
                          ref={setInputRef(idx)}
                          aria-label={`Container path ${idx + 1}`}
                          name={`volumes.${idx}.container` as Path<TForm>}
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
