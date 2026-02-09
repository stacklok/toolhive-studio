import { cva } from 'class-variance-authority'
import type { JSX, ReactNode, SVGProps } from 'react'

const actionsStyle = cva('mx-auto mt-8', {
  variants: {
    actions: {
      1: '',
      2: 'grid grid-cols-2 gap-2',
    },
  },
})

function Actions({ actions }: { actions: [ReactNode, ReactNode?] }) {
  return (
    <div className={actionsStyle({ actions: actions.length })}>{actions}</div>
  )
}

type EmptyStateProps = {
  illustration: (props: SVGProps<SVGSVGElement>) => JSX.Element
  title: string
  body: string
} & (
  | { actions: [ReactNode, ReactNode?]; children?: never }
  | { actions?: never; children: ReactNode }
)

export function EmptyState({
  actions,
  body,
  illustration: Illustration,
  title,
  children,
}: EmptyStateProps) {
  return (
    <div
      className="mx-auto flex max-w-[40rem] flex-col items-center justify-center
        py-32 text-center text-balance"
    >
      <Illustration className="mb-4 size-32" />
      <h4 className="text-foreground text-page-title mb-2">{title}</h4>
      <p className="text-muted-foreground">{body}</p>
      {actions ? <Actions actions={actions} /> : children}
    </div>
  )
}
