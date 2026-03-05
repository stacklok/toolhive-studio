export function SettingsRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm leading-5.5 font-medium">{label}</span>
      {children}
    </div>
  )
}
