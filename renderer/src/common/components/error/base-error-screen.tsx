import { TopNavContainer, TopNavLogo } from '../layout/top-nav'
import { WindowControls } from '../layout/window-controls'
import { Button } from '../ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card'
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
    <>
      <TopNavContainer className="flex justify-between">
        <TopNavLogo />
        <WindowControls />
      </TopNavContainer>
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center px-8">
        <Card className="flex max-h-[min(600px,_100%)] w-full max-w-md flex-col">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">{icon}</div>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          </CardHeader>

          <CardContent className="text-muted-foreground min-h-0 flex-1 space-y-4 overflow-y-auto px-8">
            {children}
          </CardContent>

          <CardFooter>
            <Button onClick={handleReload} className="w-full">
              <RefreshCw className="mr-2 size-4" />
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
