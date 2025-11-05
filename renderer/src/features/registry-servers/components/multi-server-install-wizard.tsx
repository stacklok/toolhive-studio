import { useState, useEffect } from 'react'
import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
  RegistryGroup,
} from '@api/types.gen'
import { FormRunFromRegistry } from './form-run-from-registry'
import { DialogFormRemoteRegistryMcp } from './dialog-form-remote-registry-mcp'

interface MultiServerInstallWizardProps {
  group: RegistryGroup | undefined
  isOpen: boolean
  onClose: () => void
}

function isRemoteServer(
  server: RegistryImageMetadata | RegistryRemoteServerMetadata
): server is RegistryRemoteServerMetadata {
  return 'url' in server
}

function getGroupServers(group: RegistryGroup | undefined) {
  if (!group) return []

  const localServers = Object.values(group.servers ?? {})
  const remoteServers = Object.values(group.remote_servers ?? {})
  return [...localServers, ...remoteServers]
}

export function MultiServerInstallWizard({
  group,
  isOpen,
  onClose,
}: MultiServerInstallWizardProps) {
  const servers = getGroupServers(group)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Reset wizard when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0)
    }
  }, [isOpen])

  if (!isOpen || servers.length === 0) return null

  const currentServer = servers[currentIndex]
  if (!currentServer) return null

  const hasMoreServers = currentIndex < servers.length - 1

  const handleNext = () => {
    if (hasMoreServers) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      onClose()
    }
  }

  // For now, just render the first server's form
  if (isRemoteServer(currentServer)) {
    return (
      <DialogFormRemoteRegistryMcp
        key={currentServer.name}
        server={currentServer}
        isOpen={isOpen}
        closeDialog={onClose}
      />
    )
  }

  return (
    <FormRunFromRegistry
      key={currentServer.name}
      server={currentServer}
      isOpen={isOpen}
      onOpenChange={onClose}
      wizardContext={{
        onNext: handleNext,
        hasMoreServers,
      }}
    />
  )
}
