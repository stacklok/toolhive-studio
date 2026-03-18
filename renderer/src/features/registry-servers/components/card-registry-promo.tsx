import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { trackEvent } from '@/common/lib/analytics'

const REGISTRY_DOCS_URL =
  'https://docs.stacklok.com/toolhive/guides-registry/?utm_source=toolhive-studio'

export function CardRegistryPromo() {
  return (
    <Card className="bg-success border-none">
      <CardHeader>
        <CardTitle className="font-serif text-[1.375rem] font-light text-white">
          Build a custom registry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-white/80">
          Connect your teams to a single trusted source of MCP servers
        </p>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button asChild size="sm" variant="action" className="rounded-full">
          <a
            href={REGISTRY_DOCS_URL}
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
