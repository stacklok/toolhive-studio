import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { trackEvent } from '@/common/lib/analytics'
import { buildOnrampDocsUrl } from '@/common/lib/onramp-url'
import { useInstanceId } from '@/common/hooks/use-instance-id'

export function CardRegistryPromo() {
  const { instanceId } = useInstanceId()
  const registryDocsUrl = buildOnrampDocsUrl('/guides-registry/', {
    campaign: 'custom-registry',
    content: 'registry-view-tile',
    instanceId,
  })

  return (
    <Card className="bg-brand-green-mid gap-0 border-none p-4">
      <CardHeader className="px-0">
        <CardTitle
          className="text-brand-green-light font-serif text-[1.375rem]
            font-light"
        >
          Build a custom registry
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <p className="text-brand-green-light/80 text-sm">
          Connect your teams to a single trusted source of MCP servers
        </p>
      </CardContent>
      <CardFooter className="mt-3 px-0">
        <Button
          asChild
          size="sm"
          variant="action"
          className="bg-brand-green-dark text-brand-green-light
            hover:bg-brand-green-dark/90 rounded-full p-4 font-medium"
        >
          <a
            href={registryDocsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('Onramp: custom registry docs clicked')}
          >
            Learn how
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}
