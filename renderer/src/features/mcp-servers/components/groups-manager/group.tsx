import type { ReactElement } from 'react'

export function Group(props: {
  name: string
  isEnabled: boolean
}): ReactElement {
  const { name, isEnabled } = props

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className={`inline-block size-[7px] rounded-full
            ${isEnabled ? 'bg-green-600' : 'bg-zinc-900/20'}`}
        />
        <span className="truncate">{name}</span>
      </div>
      <span className="text-muted-foreground text-xs">
        {isEnabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  )
}
