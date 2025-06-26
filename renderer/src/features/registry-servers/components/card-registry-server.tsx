import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/common/components/ui/card'
import type { RegistryImageMetadata } from '@/common/api/generated/types.gen'
import { Plus, StarIcon } from 'lucide-react'

export function CardRegistryServer({
  server,
  onClick,
}: {
  server: RegistryImageMetadata
  onClick?: () => void
}) {
  return (
    <Card
      className="cursor-pointer gap-3 py-5 shadow-none transition-colors hover:border-black
        dark:hover:border-white"
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-xl">
          <span>{server.name}</span>
          <Plus className="text-muted-foreground size-5" />
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="text-muted-foreground text-sm">
          {server.description}
        </div>
      </CardContent>

      {server?.metadata?.stars ? (
        <CardFooter className="mt-auto">
          <div className="flex items-center gap-2">
            <StarIcon className="text-muted-foreground size-3" />
            <span className="text-muted-foreground text-sm">
              {Intl.NumberFormat().format(server.metadata.stars)}
            </span>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  )
}
