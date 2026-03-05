export function SettingsSectionTitle({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="pt-2">
      <h2 className="font-serif text-2xl font-light tracking-tight">
        {children}
      </h2>
    </div>
  )
}
