export function TitlePage({
  title,
  children,
}: {
  title: string | React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div
      className="mb-6 flex flex-wrap gap-4 md:flex-row md:items-center
        md:justify-between"
    >
      <h1 className="text-3xl font-bold">{title}</h1>
      {children}
    </div>
  )
}
