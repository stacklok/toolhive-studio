import { TopNavMinimal } from '../layout/top-nav/minimal'
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
import { withMinimumDelay } from './utils'
import log from 'electron-log/renderer'

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
  const handleReload = async () => {
    if (typeof window !== 'undefined') {
      try {
        await withMinimumDelay(window.electronAPI.restartToolhive, 1200)
        window.location.reload()
      } catch (error) {
        log.error('Error restarting ToolHive: ', error)
      }
    }
  }

  return (
    <>
      <TopNavMinimal />
      <div
        className="mt-[64px] flex h-[calc(100vh-5rem-64px)] items-center
          justify-center px-8"
      >
        <Card
          className="mt-10 flex max-h-[min(600px,_100%)] w-full max-w-md
            flex-col"
        >
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">{icon}</div>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          </CardHeader>

          <CardContent
            className="text-muted-foreground min-h-0 flex-1 space-y-4
              overflow-y-auto px-8"
          >
            {children}
          </CardContent>

          <CardFooter>
            <Button onClick={handleReload} className="w-full rounded-full">
              <RefreshCw className="mr-2 size-4" />
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
