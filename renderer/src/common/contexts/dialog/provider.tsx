import { Fragment, useCallback, useRef, useState, type ReactNode } from 'react'
import { DialogContext, type DialogRender } from '.'

type ActiveDialog = {
  id: number
  render: () => ReactNode
  /** Settles the active dialog's promise with `null` if it is replaced. */
  cancelIfReplaced: () => void
}

/**
 * Imperative dialog primitive. `showDialog(render)` mounts whatever the
 * render function returns until `resolve` or `dismiss` is called, then
 * unmounts and resolves the promise. Each call is a fresh mount, so any
 * `useForm({ defaultValues })` inside the rendered tree reads its
 * defaults anew every time the dialog opens. Single-tenant: a second
 * `showDialog` call while a dialog is active replaces it; the replaced
 * promise resolves with `null`.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null)
  const idRef = useRef(0)

  const showDialog = useCallback(
    <T,>(render: DialogRender<T>): Promise<T | null> =>
      new Promise<T | null>((resolveOuter) => {
        const close = (value: T | null) => {
          resolveOuter(value)
          setActive((current) => (current === entry ? null : current))
        }
        const entry: ActiveDialog = {
          id: ++idRef.current,
          render: () =>
            render({
              resolve: (value: T) => close(value),
              dismiss: () => close(null),
            }),
          cancelIfReplaced: () => resolveOuter(null),
        }
        setActive((previous) => {
          if (previous) previous.cancelIfReplaced()
          return entry
        })
      }),
    []
  )

  return (
    <DialogContext.Provider value={{ showDialog }}>
      {children}
      {/*
        Keying by entry id forces React to unmount and remount the rendered
        subtree when the active dialog changes. Without it, a close + reopen
        merged into one batched render — typical of react-hook-form's deferred
        onSubmit chained into useTransition — reuses the existing component
        instance, and any state captured on the first mount
        (`useForm({ defaultValues })`, `useState(initialFromProps)`, etc.)
        silently strands. Regression covered by
        card-mcp-server.test.tsx (the copy-server-to-group flow opens
        two sequential prompts and asserts the second's defaults are read).
      */}
      {active && <Fragment key={active.id}>{active.render()}</Fragment>}
    </DialogContext.Provider>
  )
}
