import type { ReactElement } from 'react'
import type { LucideIcon } from 'lucide-react'

export function Group(props: {
  name: string
  isActive: boolean
  onClick?: () => void
  icon?: LucideIcon
}): ReactElement {
  const { name, isActive, onClick, icon: Icon } = props

  return (
    <div
      onClick={onClick}
      className={`flex h-9 w-[215px] cursor-pointer items-center gap-2 px-4 py-2
        ${
          isActive ? 'border-input bg-card rounded-full border shadow-sm' : ''
        }`}
      role="button"
      tabIndex={0}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span className="truncate">{name}</span>
    </div>
  )
}
