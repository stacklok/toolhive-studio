import type { ReactElement } from 'react'

export function Group(props: {
  name: string
  isActive: boolean
}): ReactElement {
  const { name, isActive } = props

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className={`inline-block size-2 rounded-full
            ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}
        />
        <span className="truncate">{name}</span>
      </div>
      <span className="text-muted-foreground text-xs">
        {isActive ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  )
}
