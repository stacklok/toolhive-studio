import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/common/components/ui/card'
import type { RegistryImageMetadata } from '@/common/api/generated/types.gen'
import { Plus, StarIcon } from 'lucide-react'
import { cn } from '@/common/lib/utils'

export function CardRegistryServer({
  server,
  onClick,
}: {
  server: RegistryImageMetadata
  onClick?: () => void
}) {
  return (
    <Card
      className={cn(
        'relative cursor-pointer',
        'transition-[box-shadow,color]',
        'group',
        'hover:ring',
        'has-[button:focus-visible]:ring'
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-xl">
          <button
            className="!outline-none select-none"
            onClick={() => onClick?.()}
          >
            {server.name}
            {/** make the entire area of the card clickable */}
            <span className="absolute inset-0 rounded-md" />{' '}
          </button>
          <Plus
            className="text-muted-foreground group-has-[button:focus-visible]:text-foreground
              group-hover:text-foreground transition-color size-5"
          />
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="text-muted-foreground text-sm select-none">
          {server.description}
        </div>
      </CardContent>

      {server?.metadata?.stars ? (
        <CardFooter className="mt-auto">
          <div className="flex items-center gap-2">
            <StarIcon className="text-muted-foreground size-3" />
            <span className="text-muted-foreground text-sm select-none">
              {Intl.NumberFormat().format(server.metadata.stars)}
            </span>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  )
}
