import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface ResponseTimerProps {
  startTime: number | null
  isLoading: boolean
}

export function ResponseTimer({ startTime, isLoading }: ResponseTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!startTime || !isLoading) {
      setElapsedTime(0)
      return
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 100) // Update every 100ms for smooth animation

    return () => clearInterval(interval)
  }, [startTime, isLoading])

  if (!isLoading || !startTime) {
    return null
  }

  const seconds = (elapsedTime / 1000).toFixed(1)

  return (
    <div
      className="text-muted-foreground flex animate-pulse items-center gap-2
        text-sm"
    >
      <Clock className="h-4 w-4" />
      <span>{seconds}s</span>
    </div>
  )
}
