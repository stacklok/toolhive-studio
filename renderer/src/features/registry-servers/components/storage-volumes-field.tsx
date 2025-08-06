import {
  FormDescription,
  FormItem,
  FormLabel,
} from '@/common/components/ui/form'

export function StorageVolumesField() {
  return (
    <FormItem className="mb-10">
      <FormLabel>Storage volumes</FormLabel>
      <FormDescription>
        Provide the MCP server access to a local folder. Optionally specific
        individual files.
      </FormDescription>
    </FormItem>
  )
}
