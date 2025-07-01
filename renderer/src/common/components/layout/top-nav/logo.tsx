import { Logo } from '../../logo'

export function TopNavLogo() {
  return (
    <div className="flex items-center gap-2">
      <Logo className="h-[21.01px]" />
      <span className="font-display text-2xl font-semibold">ToolHive</span>
    </div>
  )
}
