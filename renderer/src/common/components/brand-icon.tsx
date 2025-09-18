import type { ComponentProps, JSX } from 'react'
import { Package } from 'lucide-react'
import { SiAnthropic, SiJetbrains } from '@icons-pack/react-simple-icons'

type Props = {
  name: string
} & Pick<ComponentProps<'svg'>, 'className' | 'aria-hidden' | 'focusable'>

type IconComponent = (p: ComponentProps<'svg'>) => JSX.Element

// Map known client identifiers to React Simple Icons components.
const ICONS: Record<string, IconComponent> = {
  // Anthropic / Claude Code
  'claude-code': (p) => <SiAnthropic {...p} />,
  // JetBrains for windsorf plugin targeting JetBrains IDEs
  'windsurf-jetbrains': (p) => <SiJetbrains {...p} />,
}

export function BrandIcon({ name, className, ...rest }: Props) {
  const key = name.toLowerCase()
  const Icon = ICONS[key]
  if (Icon) return <Icon className={className} aria-hidden {...rest} />

  // Fallback to a generic lucide package icon when no brand is available
  return <Package className={className} {...rest} />
}

export default BrandIcon
