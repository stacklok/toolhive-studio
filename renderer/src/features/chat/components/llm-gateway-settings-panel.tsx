import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { Loader2 } from 'lucide-react'
import {
  ensureGatewayReady,
  useLlmGatewayStatus,
} from '../hooks/use-llm-gateway'

interface LlmGatewaySettingsPanelProps {
  onStatusChange?: () => void
}

const DEFAULT_PROXY_PORT = 14000
const DEFAULT_CALLBACK_PORT = 8080

function authStateLabel(
  authState: Awaited<
    ReturnType<typeof window.electronAPI.chat.llmGateway.getStatus>
  >['authState']
): string {
  switch (authState) {
    case 'ready':
      return 'Signed in'
    case 'authenticating':
      return 'Sign-in required'
    case 'proxy_stopped':
      return 'Proxy stopped'
    case 'error':
      return 'Error'
    case 'not_configured':
      return 'Not configured'
    default:
      return authState
  }
}

export function LlmGatewaySettingsPanel({
  onStatusChange,
}: LlmGatewaySettingsPanelProps) {
  const queryClient = useQueryClient()
  const {
    data: status,
    isLoading: isStatusLoading,
    refetch,
    isFetching,
  } = useLlmGatewayStatus()

  const { data: savedConfig, isLoading: isConfigLoading } = useQuery({
    queryKey: ['chat', 'llmGateway', 'config'],
    queryFn: () => window.electronAPI.chat.llmGateway.getConfig(),
  })

  const [gatewayUrl, setGatewayUrl] = useState('')
  const [issuer, setIssuer] = useState('')
  const [audience, setAudience] = useState('')
  const [clientId, setClientId] = useState('')
  const [callbackPort, setCallbackPort] = useState(
    String(DEFAULT_CALLBACK_PORT)
  )
  const [proxyPort, setProxyPort] = useState(String(DEFAULT_PROXY_PORT))
  const [saveError, setSaveError] = useState<string | null>(null)

  const configFingerprint = savedConfig
    ? [
        savedConfig.gatewayUrl,
        savedConfig.issuer,
        savedConfig.audience ?? '',
        savedConfig.clientId,
        savedConfig.callbackPort ?? '',
        savedConfig.proxyPort ?? '',
      ].join('|')
    : ''
  const [prevConfigFingerprint, setPrevConfigFingerprint] = useState('')
  if (savedConfig && configFingerprint !== prevConfigFingerprint) {
    setPrevConfigFingerprint(configFingerprint)
    setGatewayUrl(savedConfig.gatewayUrl)
    setIssuer(savedConfig.issuer)
    setAudience(savedConfig.audience ?? '')
    setClientId(savedConfig.clientId)
    setCallbackPort(
      savedConfig.callbackPort != null
        ? String(savedConfig.callbackPort)
        : String(DEFAULT_CALLBACK_PORT)
    )
    setProxyPort(
      savedConfig.proxyPort != null
        ? String(savedConfig.proxyPort)
        : String(DEFAULT_PROXY_PORT)
    )
  }

  const saveConfigMutation = useMutation({
    mutationFn: () =>
      window.electronAPI.chat.llmGateway.saveConfig({
        gatewayUrl: gatewayUrl.trim(),
        issuer: issuer.trim(),
        clientId: clientId.trim(),
        audience: audience.trim() || undefined,
        callbackPort: Number.parseInt(callbackPort, 10) || undefined,
        proxyPort: Number.parseInt(proxyPort, 10) || undefined,
      }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setSaveError(result.error ?? 'Failed to save gateway configuration')
        return
      }
      setSaveError(null)
      await queryClient.invalidateQueries({ queryKey: ['chat', 'llmGateway'] })
      await queryClient.invalidateQueries({
        queryKey: ['chat', 'availableModels'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['chat', 'allProvidersWithSettings'],
      })
      onStatusChange?.()
    },
    onError: (error) => {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Failed to save gateway configuration'
      )
    },
  })

  const handleStart = async () => {
    try {
      await window.electronAPI.chat.llmGateway.ensureStarted()
      setSaveError(null)
      await refetch()
      onStatusChange?.()
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Failed to start the LLM proxy'
      )
    }
  }

  const handleSignIn = async () => {
    try {
      const ready = await ensureGatewayReady()
      if (!ready.ready) {
        setSaveError(ready.error ?? 'Sign-in did not complete')
      } else {
        setSaveError(null)
      }
      await refetch()
      onStatusChange?.()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to sign in')
    }
  }

  const isLoading = isStatusLoading || isConfigLoading

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">Loading gateway settings…</p>
    )
  }

  return (
    <div className="space-y-4 pt-2">
      <p className="text-muted-foreground text-xs">
        Same connection settings as{' '}
        <code className="text-[10px]">thv llm setup</code>. Save to enable this
        provider in Playground — no API key required.
      </p>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="llm-gateway-url">Gateway URL</Label>
          <Input
            id="llm-gateway-url"
            value={gatewayUrl}
            onChange={(e) => setGatewayUrl(e.target.value)}
            placeholder="https://llm-gateway.stacklok.dev"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="llm-issuer">Issuer</Label>
          <Input
            id="llm-issuer"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="https://your-idp.example.com/oauth2/default"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="llm-audience">Audience (optional)</Label>
          <Input
            id="llm-audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="api://llm-gateway"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="llm-client-id">Client ID</Label>
          <Input
            id="llm-client-id"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="0oa..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="llm-callback-port">Callback port</Label>
            <Input
              id="llm-callback-port"
              type="number"
              min={1}
              max={65535}
              value={callbackPort}
              onChange={(e) => setCallbackPort(e.target.value)}
              placeholder={String(DEFAULT_CALLBACK_PORT)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="llm-proxy-port">Local proxy port</Label>
            <Input
              id="llm-proxy-port"
              type="number"
              min={1}
              max={65535}
              value={proxyPort}
              onChange={(e) => setProxyPort(e.target.value)}
              placeholder={String(DEFAULT_PROXY_PORT)}
            />
          </div>
        </div>

        {saveError ? (
          <p className="text-destructive text-sm">{saveError}</p>
        ) : null}

        <Button
          type="button"
          size="sm"
          onClick={() => saveConfigMutation.mutate()}
          disabled={saveConfigMutation.isPending}
        >
          {saveConfigMutation.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          Save connection settings
        </Button>
      </div>

      {status?.configured ? (
        <div className="space-y-3 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={status.authState === 'ready' ? 'secondary' : 'outline'}
            >
              {authStateLabel(status.authState)}
            </Badge>
            {status.proxyRunning ? (
              <Badge variant="secondary">Proxy running</Badge>
            ) : (
              <Badge variant="outline">Proxy stopped</Badge>
            )}
            {status.modelCount > 0 ? (
              <span className="text-muted-foreground text-xs">
                {status.modelCount} model{status.modelCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          {status.baseURL ? (
            <p className="text-muted-foreground text-xs break-all">
              Playground endpoint: {status.baseURL}
            </p>
          ) : null}
          {status.error ? (
            <p className="text-destructive text-sm">{status.error}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {!status.proxyRunning ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleStart}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Start proxy
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSignIn}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Sign in
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
