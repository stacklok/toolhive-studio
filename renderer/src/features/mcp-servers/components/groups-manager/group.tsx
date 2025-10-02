import type { ReactElement } from 'react'

export function Group(props: {
  name: string
  isActive: boolean
  onClick?: () => void
}): ReactElement {
  const { name, isActive, onClick } = props

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
      <span className="truncate">{name}</span>
    </div>
  )
}
