import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/common/components/ui/card'
import type { RegistryImageMetadata } from '@/common/api/generated/types.gen'
import { Plus } from 'lucide-react'

export function CardRegistryServer({
  server,
  onClick,
}: {
  server: RegistryImageMetadata
  onClick?: () => void
}) {
  return (
    <Card
      className="cursor-pointer gap-3 border-none py-5 shadow-none transition-colors outline-none
        hover:border-black dark:hover:border-white"
      onClick={onClick}
    >
      <CardHeader className="px-4">
        <CardTitle className="flex items-center justify-between text-xl">
          <span>{server.name}</span>
          <Plus className="text-muted-foreground size-5" />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-muted-foreground text-sm">
          {server.description}
        </div>
      </CardContent>
    </Card>
  )
}
