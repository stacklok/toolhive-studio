export function TitlePage({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-4">
      <h1 className="text-3xl font-bold">{title}</h1>
      {children}
    </div>
  )
}
