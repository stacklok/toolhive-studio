import type { ReactElement } from 'react'

export function Group(props: {
  name: string
  isEnabled: boolean
  isActive: boolean
}): ReactElement {
  const { name, isEnabled, isActive } = props

  return (
    <div
      className={`flex h-9 w-[215px] items-center gap-2 px-4 py-2 ${
        isActive ? 'border-input bg-background rounded-md border shadow-sm' : ''
        }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className={`inline-block size-[7px] rounded-full
            ${isEnabled ? 'bg-green-600' : 'bg-zinc-900/20'}`}
        />
        <span className="truncate">{name}</span>
      </div>
    </div>
  )
}
