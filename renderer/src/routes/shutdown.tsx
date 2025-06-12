import { createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'

export const Route = createFileRoute('/shutdown')({
  component: Shutdown,
})

function Shutdown() {
  return (
    <div className="flex h-[calc(100vh-5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Loader2 className="text-muted-foreground size-12 animate-spin" />
          </div>
          <CardTitle className="text-2xl font-semibold">
            Shutting Down Servers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Please wait while we safely shut down your MCP servers...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
