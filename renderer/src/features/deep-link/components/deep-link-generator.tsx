import { useState } from 'react'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { Textarea } from '@/common/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useDeepLink } from '@/common/hooks/use-deep-link'

interface DeepLinkGeneratorProps {
  serverName?: string
  registryName?: string
  environment?: Record<string, string>
  secrets?: Record<string, string>
}

export function DeepLinkGenerator({
  serverName: initialServerName = '',
  registryName: initialRegistryName = '',
  environment: initialEnvironment = {},
  secrets: initialSecrets = {},
}: DeepLinkGeneratorProps) {
  const [serverName, setServerName] = useState(initialServerName)
  const [registryName, setRegistryName] = useState(initialRegistryName)
  const [environmentText, setEnvironmentText] = useState(
    Object.entries(initialEnvironment)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
  )
  const [secretsText, setSecretsText] = useState(
    Object.entries(initialSecrets)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
  )
  const [generatedLink, setGeneratedLink] = useState('')
  const [generatedCliCommand, setGeneratedCliCommand] = useState('')

  const { generateInstallLink, generateCliCommand } = useDeepLink()

  const parseKeyValueText = (text: string): Record<string, string> => {
    const result: Record<string, string> = {}
    text.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (trimmed && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key) {
          result[key.trim()] = valueParts.join('=').trim()
        }
      }
    })
    return result
  }

  const handleGenerate = async () => {
    if (!serverName.trim()) {
      toast.error('Server name is required')
      return
    }

    try {
      const environment = parseKeyValueText(environmentText)
      const secrets = parseKeyValueText(secretsText)

      const [link, cliCommand] = await Promise.all([
        generateInstallLink?.(
          serverName.trim(),
          registryName.trim() || undefined,
          Object.keys(environment).length > 0 ? environment : undefined,
          Object.keys(secrets).length > 0 ? secrets : undefined
        ),
        generateCliCommand?.(
          serverName.trim(),
          registryName.trim() || undefined,
          Object.keys(environment).length > 0 ? environment : undefined,
          Object.keys(secrets).length > 0 ? secrets : undefined
        ),
      ])

      setGeneratedLink(link || '')
      setGeneratedCliCommand(cliCommand || '')
    } catch (error) {
      console.error('Failed to generate deep link:', error)
      toast.error('Failed to generate deep link')
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${type} copied to clipboard`)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast.error('Failed to copy to clipboard')
    }
  }

  const openLink = () => {
    if (generatedLink) {
      window.open(generatedLink, '_blank')
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Deep Link Generator</CardTitle>
        <CardDescription>
          Generate deep links to install and configure MCP servers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="serverName">Server Name *</Label>
            <Input
              id="serverName"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="e.g., github-mcp-server"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registryName">Registry Name (optional)</Label>
            <Input
              id="registryName"
              value={registryName}
              onChange={(e) => setRegistryName(e.target.value)}
              placeholder="e.g., official"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="environment">Environment Variables (optional)</Label>
          <Textarea
            id="environment"
            value={environmentText}
            onChange={(e) => setEnvironmentText(e.target.value)}
            placeholder="KEY1=value1&#10;KEY2=value2"
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secrets">Secrets (optional)</Label>
          <Textarea
            id="secrets"
            value={secretsText}
            onChange={(e) => setSecretsText(e.target.value)}
            placeholder="API_KEY=your-api-key&#10;TOKEN=your-token"
            className="min-h-[80px]"
          />
        </div>

        <Button onClick={handleGenerate} className="w-full">
          Generate Deep Link
        </Button>

        {generatedLink && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label>Deep Link URL</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(generatedLink, 'Deep link')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={openLink}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {generatedCliCommand && (
              <div className="space-y-2">
                <Label>CLI Command Alternative</Label>
                <div className="flex gap-2">
                  <Textarea
                    value={generatedCliCommand}
                    readOnly
                    className="min-h-[60px] font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(generatedCliCommand, 'CLI command')
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
