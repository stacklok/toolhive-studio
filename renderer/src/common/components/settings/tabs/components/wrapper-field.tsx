import { Label } from '@/common/components/ui/label'

export function WrapperField({
  children,
  label,
  description,
  htmlFor,
}: {
  children: React.ReactNode
  label: string
  description: React.ReactNode
  htmlFor: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </div>
  )
}
