import type { ComponentProps } from 'react'
import { Icon } from '@iconify/react'
import homeIcon from '@iconify/icons-heroicons-outline/home'
import vscodeIcons from '@iconify-json/vscode-icons/icons.json'
import simpleIcons from '@iconify-json/simple-icons/icons.json'

type Props = {
  name: string
} & Pick<ComponentProps<'svg'>, 'className' | 'aria-hidden' | 'focusable'>

const cursorRulesIcon = (vscodeIcons as any).icons?.['file-type-cursorrules']
const claudeIcon = (simpleIcons as any).icons?.['claude']

const ICONS: Record<string, unknown> = {
  // Cursor editor
  cursor: cursorRulesIcon,
  // Claude (Anthropic)
  'claude-code': claudeIcon,
}

export default function BrandIcon({ name, className, ...rest }: Props) {
  const key = name.toLowerCase()
  const icon = (ICONS[key] ?? homeIcon) as any
  return (
    <Icon
      icon={icon}
      className={className}
      aria-hidden
      inline={false}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible', display: 'block' }}
      {...rest}
    />
  )
}
