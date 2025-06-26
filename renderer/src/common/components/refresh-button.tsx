import { RefreshCwIcon } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { useState, useEffect, ButtonHTMLAttributes } from 'react'

/**
 * A custom hook that resets a boolean value after a specified delay.
 */
const useDelayedReset = (initialValue = false, delayMs = 1000) => {
  const [value, setValue] = useState<boolean>(initialValue)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined

    if (value) {
      timeoutId = setTimeout(() => {
        setValue(false)
      }, delayMs)
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [value, delayMs])

  return [value, setValue] as const
}

export function RefreshButton({
  refresh,
  className,
  ...buttonProps
}: {
  refresh: () => void
  className?: string
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const [isAnimating, setIsAnimating] = useDelayedReset(false, 500)

  function handleRefresh() {
    refresh()
    setIsAnimating(true)
  }

  return (
    <Button
      className={cn('text-muted-foreground', className)}
      variant="ghost"
      size="icon"
      type="button"
      onClick={() => handleRefresh()}
      {...buttonProps}
    >
      <RefreshCwIcon className={isAnimating ? 'animate-spin' : ''} />
    </Button>
  )
}
