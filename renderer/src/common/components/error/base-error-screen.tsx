import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

interface BaseErrorScreenProps {
  title: string
  icon: ReactNode
  children: ReactNode
}

export function BaseErrorScreen({
  title,
  icon,
  children,
}: BaseErrorScreenProps) {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-none">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">{icon}</div>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          <Button onClick={handleReload} className="w-full">
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
