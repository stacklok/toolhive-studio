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
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Loader2 className="text-muted-foreground size-12 animate-spin" />
          </div>
          <CardTitle className="text-2xl font-semibold">
            Stopping MCP Servers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Please wait while ToolHive safely shuts down your MCP servers...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
