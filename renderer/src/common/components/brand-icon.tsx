import type { ComponentProps } from 'react'
import { Package } from 'lucide-react'
// Import only the needed Simple Icons to keep bundle size small
// Each import is a JS object with { title, slug, hex, path, ... }
import visualStudioCode from 'simple-icons/icons/visualstudiocode.js'
import anthropic from 'simple-icons/icons/anthropic.js'
import sourcegraph from 'simple-icons/icons/sourcegraph.js'
import jetbrains from 'simple-icons/icons/jetbrains.js'

type Props = {
  name: string
} & Pick<ComponentProps<'svg'>, 'className' | 'aria-hidden' | 'focusable'>

type SimpleIcon = { title: string; path: string }

// Map known client identifiers to Simple Icons data objects.
const ICONS: Record<string, SimpleIcon> = {
  // VS Code
  vscode: visualStudioCode,
  'vscode-insider': visualStudioCode,
  // Anthropic / Claude Code
  'claude-code': anthropic,
  // Sourcegraph Amp (map derivatives to Sourcegraph brand)
  'amp-cli': sourcegraph,
  'amp-cursor': sourcegraph,
  'amp-windsurf': sourcegraph,
  // JetBrains for windsorf plugin targeting JetBrains IDEs
  'windsurf-jetbrains': jetbrains,
}

export function BrandIcon({ name, className, ...rest }: Props) {
  const key = name.toLowerCase()
  const icon = ICONS[key]
  if (icon) {
    return (
      <svg
        viewBox="0 0 24 24"
        role="img"
        aria-label={icon.title}
        className={className}
        fill="currentColor"
        {...rest}
      >
        <path d={icon.path} />
      </svg>
    )
  }

  // Fallback to a generic lucide package icon when no brand is available
  return <Package className={className} {...rest} />
}

export default BrandIcon
