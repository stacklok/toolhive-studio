import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Home, FileQuestion } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="flex h-[calc(100vh-5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-none outline-none">
        <CardHeader className="px-4 text-center">
          <div className="mb-4 flex justify-center">
            <FileQuestion className="text-muted-foreground size-12" />
          </div>
          <CardTitle className="text-2xl font-semibold">
            404 - Page Not Found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 text-center">
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button asChild className="w-full">
            <Link to="/">
              <Home className="mr-2 size-4" />
              Go to Installed
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
