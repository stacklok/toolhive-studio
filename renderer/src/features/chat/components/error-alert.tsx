import { useState, useEffect } from 'react'
import { Button } from '@/common/components/ui/button'
import { Alert, AlertDescription } from '@/common/components/ui/alert'
import { X, AlertTriangle } from 'lucide-react'

interface ErrorAlertProps {
  error: string | null
  className?: string
}

export function ErrorAlert({ error, className = '' }: ErrorAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  // Reset dismissed state when a new error occurs
  useEffect(() => {
    if (error) {
      setIsDismissed(false)
    }
  }, [error])

  if (!error || isDismissed) {
    return null
  }

  return (
    <div className={`container mx-auto py-4 ${className}`}>
      <Alert
        variant="destructive"
        className="border-destructive/20 bg-destructive/10 relative"
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="pr-8">{error}</AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-destructive/20 absolute top-2 right-2 h-6 w-6 p-0"
          onClick={() => setIsDismissed(true)}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Dismiss error</span>
        </Button>
      </Alert>
    </div>
  )
}
