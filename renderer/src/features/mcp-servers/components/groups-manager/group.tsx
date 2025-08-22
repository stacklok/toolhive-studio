import type { ReactElement } from 'react'

export function Group(props: {
  name: string
  isEnabled: boolean
  isActive: boolean
  onClick?: () => void
}): ReactElement {
  const { name, isEnabled, isActive, onClick } = props

  return (
    <div
      onClick={onClick}
      className={`flex h-9 w-[215px] cursor-pointer items-center gap-2 px-4 py-2
        ${
          isActive
            ? 'border-input bg-background rounded-md border shadow-sm'
            : ''
        }`}
      role="button"
      tabIndex={0}
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
