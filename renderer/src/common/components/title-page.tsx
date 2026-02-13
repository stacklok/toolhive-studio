export function TitlePage({
  title,
  children,
}: {
  title: string | React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-4">
      <div
        className="flex flex-wrap gap-4 space-y-5 md:flex-row md:items-center
          md:justify-between"
      >
        <h1 className="text-page-title mb-0">{title}</h1>
        {children}
      </div>
    </div>
  )
}
