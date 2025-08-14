import { FolderOpen, File } from 'lucide-react'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { Input } from './input'

function FilePicker({
  onPick,
}: {
  onPick: (args: { pickedPath: string | null }) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="adornment" aria-label="Select path">
          <FolderOpen className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" role="menu">
        <DropdownMenuItem
          onClick={async () => {
            try {
              const filePath = await window.electronAPI.selectFile()
              onPick({ pickedPath: filePath })
            } catch (err) {
              console.error('Failed to open file picker', err)
            }
          }}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <File className="size-4" />
            <span>Mount a single file</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            try {
              const folderPath = await window.electronAPI.selectFolder()
              onPick({ pickedPath: folderPath })
            } catch (err) {
              console.error('Failed to open folder picker', err)
            }
          }}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="size-4" />
            <span>Mount an entire folder</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilePickerInput({
  onChange,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> & {
  onChange: (props: { newValue: string }) => void
}) {
  return (
    <Input
      {...props}
      type="text"
      adornment={
        <FilePicker
          onPick={({ pickedPath }) => {
            if (pickedPath) {
              onChange({ newValue: pickedPath })
            }
          }}
        />
      }
      onChange={(event) => onChange({ newValue: event.target.value })}
    />
  )
}

export { FilePickerInput }
