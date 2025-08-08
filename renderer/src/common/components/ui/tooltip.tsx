import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '@/common/lib/utils'
import { useIsTruncated } from '@/common/hooks/use-is-truncated'

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root> & {
  onlyWhenTruncated?: boolean
}

const TruncateContext = React.createContext<{
  onlyWhenTruncated: boolean
  triggerRef: React.RefObject<HTMLElement | null>
} | null>(null)

function Tooltip({ onlyWhenTruncated = false, ...props }: TooltipProps) {
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const isTruncated = useIsTruncated(triggerRef)

  const contextValue = React.useMemo(
    () => ({ onlyWhenTruncated, triggerRef }),
    [onlyWhenTruncated]
  )

  const effectiveOpen = onlyWhenTruncated
    ? // if not truncated, force closed; otherwise respect consumer control
      isTruncated
      ? props.open
      : false
    : props.open

  return (
    <TooltipProvider>
      <TruncateContext.Provider value={contextValue}>
        <TooltipPrimitive.Root
          data-slot="tooltip"
          {...props}
          open={effectiveOpen}
        />
      </TruncateContext.Provider>
    </TooltipProvider>
  )
}

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof TooltipPrimitive.Trigger>
>(function TooltipTrigger({ ...props }, forwardedRef) {
  const ctx = React.useContext(TruncateContext)

  const setRefs = React.useCallback(
    (node: HTMLButtonElement | null) => {
      // internal: keep track for truncation measurement
      if (ctx) ctx.triggerRef.current = node
      // forward to consumer
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        ;(
          forwardedRef as React.MutableRefObject<HTMLButtonElement | null>
        ).current = node
      }
    },
    [ctx, forwardedRef]
  )

  return (
    <TooltipPrimitive.Trigger
      ref={ctx?.onlyWhenTruncated ? setRefs : forwardedRef}
      data-slot="tooltip-trigger"
      {...props}
    />
  )
})

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          `bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95
          data-[state=closed]:animate-out data-[state=closed]:fade-out-0
          data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2
          data-[side=left]:slide-in-from-right-2
          data-[side=right]:slide-in-from-left-2
          data-[side=top]:slide-in-from-bottom-2 z-50 w-fit
          origin-(--radix-tooltip-content-transform-origin) rounded-md px-3
          py-1.5 text-xs text-balance`,
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          className="bg-primary fill-primary z-50 size-2.5
            translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]"
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
