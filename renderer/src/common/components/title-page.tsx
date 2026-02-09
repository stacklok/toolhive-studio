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
        <h1
          className="mb-0 font-serif text-[34px] leading-[42px] font-light
            tracking-[-0.85px]"
        >
          {title}
        </h1>
        {children}
      </div>
    </div>
  )
}
