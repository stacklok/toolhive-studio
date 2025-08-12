import { useState, useEffect } from 'react'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Card } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { Eye, EyeOff, Key, Check, AlertCircle } from 'lucide-react'
import type { ChatProviderInfo } from '../types'

interface DialogApiKeysProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

interface ProviderApiKey {
  provider: ChatProviderInfo
  apiKey: string
  hasKey: boolean
}

export function DialogApiKeys({
  isOpen,
  onOpenChange,
  onSaved,
}: DialogApiKeysProps) {
  const [providerKeys, setProviderKeys] = useState<ProviderApiKey[]>([])
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadProvidersAndKeys()
    }
  }, [isOpen])

  const loadProvidersAndKeys = async () => {
    try {
      const allProviders = await window.electronAPI.chat.getProviders()

      // Load existing API keys for each provider
      const keysData = await Promise.all(
        allProviders.map(async (provider) => {
          try {
            const settings = await window.electronAPI.chat.getSettings(
              provider.id
            )
            return {
              provider,
              apiKey: settings.apiKey || '',
              hasKey: Boolean(settings.apiKey),
            }
          } catch {
            return {
              provider,
              apiKey: '',
              hasKey: false,
            }
          }
        })
      )

      setProviderKeys(keysData)
    } catch (error) {
      console.error('Failed to load providers and keys:', error)
    }
  }

  const handleApiKeyChange = (providerId: string, apiKey: string) => {
    setProviderKeys((prev) =>
      prev.map((pk) =>
        pk.provider.id === providerId
          ? { ...pk, apiKey, hasKey: Boolean(apiKey) }
          : pk
      )
    )
  }

  const toggleShowApiKey = (providerId: string) => {
    setShowApiKeys((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save API keys for each provider
      await Promise.all(
        providerKeys.map(async (pk) => {
          if (pk.apiKey) {
            await window.electronAPI.chat.saveSettings(pk.provider.id, {
              apiKey: pk.apiKey,
              enabledTools: [], // Keep existing enabled tools or default to empty
            })
          }
        })
      )

      onSaved?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save API keys:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Manage API Keys
          </DialogTitle>
          <DialogDescription>
            Configure your API keys for different AI providers. Only providers
            with API keys will be available for model selection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {providerKeys.map((pk) => (
            <Card key={pk.provider.id} className="p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{pk.provider.name}</h3>
                  {pk.hasKey ? (
                    <Badge variant="default" className="text-xs">
                      <Check className="mr-1 h-3 w-3" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      No API Key
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {pk.provider.models.length} models
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`apikey-${pk.provider.id}`}>API Key</Label>
                <div className="relative">
                  <Input
                    id={`apikey-${pk.provider.id}`}
                    type={showApiKeys[pk.provider.id] ? 'text' : 'password'}
                    value={pk.apiKey}
                    onChange={(e) =>
                      handleApiKeyChange(pk.provider.id, e.target.value)
                    }
                    placeholder={`Enter your ${pk.provider.name} API key`}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-0 right-0 h-full px-3 py-2
                      hover:bg-transparent"
                    onClick={() => toggleShowApiKey(pk.provider.id)}
                  >
                    {showApiKeys[pk.provider.id] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Show sample models */}
                <div className="text-muted-foreground text-xs">
                  Available models: {pk.provider.models.slice(0, 3).join(', ')}
                  {pk.provider.models.length > 3 &&
                    ` +${pk.provider.models.length - 3} more`}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save API Keys'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
