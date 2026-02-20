import { ShieldCheck } from 'lucide-react'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'

interface ComplianceCheckMenuItemProps {
  onRecheck: () => void
  disabled: boolean
}

export function ComplianceCheckMenuItem({
  onRecheck,
  disabled,
}: ComplianceCheckMenuItemProps) {
  return (
    <DropdownMenuItem
      className="flex cursor-pointer items-center"
      disabled={disabled}
      onClick={onRecheck}
    >
      <ShieldCheck className="mr-2 h-4 w-4" />
      Re-check MCP compliance
    </DropdownMenuItem>
  )
}
