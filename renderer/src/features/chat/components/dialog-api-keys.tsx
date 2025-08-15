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
import { Badge } from '@/common/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/common/components/ui/collapsible'
import {
  Eye,
  EyeOff,
  Key,
  Check,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { getProviderIcon } from './provider-icons'
import type { ChatProvider } from '../types'

interface DialogApiKeysProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

interface ProviderApiKey {
  provider: ChatProvider
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
  const [expandedProviders, setExpandedProviders] = useState<
    Record<string, boolean>
  >({})
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

      // Start with all providers collapsed
      const expandedState: Record<string, boolean> = {}
      keysData.forEach((pk) => {
        expandedState[pk.provider.id] = false
      })
      setExpandedProviders(expandedState)
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

  const handleRemoveApiKey = (providerId: string) => {
    setProviderKeys((prev) =>
      prev.map((pk) =>
        pk.provider.id === providerId
          ? { ...pk, apiKey: '', hasKey: false }
          : pk
      )
    )
  }

  const toggleProviderExpanded = (providerId: string) => {
    setExpandedProviders((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save or clear API keys for each provider
      await Promise.all(
        providerKeys.map(async (pk) => {
          if (pk.apiKey.trim()) {
            // Save API key
            await window.electronAPI.chat.saveSettings(pk.provider.id, {
              apiKey: pk.apiKey.trim(),
              enabledTools: [], // Keep existing enabled tools or default to empty
            })
          } else {
            // Clear/remove API key
            await window.electronAPI.chat.clearSettings(pk.provider.id)
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

        <div className="space-y-2">
          {providerKeys.map((pk) => (
            <Collapsible
              key={pk.provider.id}
              open={expandedProviders[pk.provider.id]}
              onOpenChange={() => toggleProviderExpanded(pk.provider.id)}
              className="border-border overflow-hidden rounded-lg border"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="hover:bg-muted/50 h-auto w-full justify-between
                    rounded-none p-4"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getProviderIcon(pk.provider.id)}
                        <h3 className="text-left font-medium">
                          {pk.provider.name}
                        </h3>
                      </div>
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
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {pk.provider.models.length} models
                      </Badge>
                      {expandedProviders[pk.provider.id] ? (
                        <ChevronDown className="text-muted-foreground h-4 w-4" />
                      ) : (
                        <ChevronRight className="text-muted-foreground h-4 w-4" />
                      )}
                    </div>
                  </div>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div
                  className="border-border/30 bg-muted/10 space-y-3 border-t
                    px-4 pb-4"
                >
                  <div className="space-y-3 pt-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`apikey-${pk.provider.id}`}
                        className="text-sm font-medium"
                      >
                        API Key
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id={`apikey-${pk.provider.id}`}
                            type={
                              showApiKeys[pk.provider.id] ? 'text' : 'password'
                            }
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
                              <EyeOff className="text-muted-foreground h-4 w-4" />
                            ) : (
                              <Eye className="text-muted-foreground h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {pk.hasKey && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveApiKey(pk.provider.id)}
                            className="hover:bg-destructive
                              hover:text-destructive-foreground px-3"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Show sample models */}
                    <div
                      className="text-muted-foreground bg-background/50
                        border-border/20 rounded border p-2 text-xs"
                    >
                      <span className="font-medium">Available models:</span>{' '}
                      {pk.provider.models.slice(0, 3).join(', ')}
                      {pk.provider.models.length > 3 &&
                        ` +${pk.provider.models.length - 3} more`}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
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
