export function TitlePage({
  title,
  children,
  variant = 'default',
}: {
  title: string | React.ReactNode
  children?: React.ReactNode
  variant?: 'default' | 'group'
}) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-wrap gap-4 md:flex-row md:items-center
          md:justify-between"
      >
        <h1
          className="font-serif text-[34px] leading-[42px] font-light
            tracking-[-0.85px]"
        >
          {title}
        </h1>
        {children}
      </div>
      {variant === 'group' && (
        <div className="py-4">
          <div className="border-border h-px w-full border-t" />
        </div>
      )}
    </div>
  )
}
