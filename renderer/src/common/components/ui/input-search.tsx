import { SearchIcon, XIcon } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'

export function InputSearch({
  onChange,
  value,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative max-w-60">
      <div
        className="pointer-events-none absolute top-1/2 left-0 flex size-9
          -translate-y-1/2 items-center justify-center"
      >
        <SearchIcon className="text-muted-foreground size-4" />
      </div>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange('')}
          className="text-muted-foreground hover:text-foreground absolute
            top-1/2 right-1 size-7 -translate-y-1/2"
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  )
}
