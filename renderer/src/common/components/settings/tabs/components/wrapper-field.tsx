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
    <div className="flex items-center justify-between py-1">
      <div className="min-w-0 flex-1">
        <Label htmlFor={htmlFor} className="leading-5.5 font-medium">
          {label}
        </Label>
        <p className="text-muted-foreground text-sm leading-5.5">
          {description}
        </p>
      </div>
      <div className="ml-4 shrink-0">{children}</div>
    </div>
  )
}
