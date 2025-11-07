import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
  RegistryGroup,
} from '@api/types.gen'
import { FormRunFromRegistry } from './form-run-from-registry'
import { DialogFormRemoteRegistryMcp } from './dialog-form-remote-registry-mcp'
import { useMutationCreateGroup } from '@/features/mcp-servers/hooks/use-mutation-create-group'

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
  const [wizardState, setWizardState] = useState({
    currentIndex: 0,
    isGroupCreated: false,
  })
  const navigate = useNavigate()
  const createGroupMutation = useMutationCreateGroup()

  useEffect(() => {
    if (!isOpen) {
      setWizardState({ currentIndex: 0, isGroupCreated: false })
    } else if (!wizardState.isGroupCreated && group?.name) {
      createGroupMutation
        .mutateAsync({
          body: {
            name: group.name,
          },
        })
        .then(() => {
          setWizardState((prev) => ({ ...prev, isGroupCreated: true }))
        })
        .catch(() => {
          onClose()
        })
    }
  }, [isOpen, wizardState.isGroupCreated, group?.name])

  if (!isOpen || servers.length === 0 || !group?.name) return null

  const currentServer = servers[wizardState.currentIndex]
  if (!currentServer) return null

  const hasMoreServers = wizardState.currentIndex < servers.length - 1

  const handleNext = (closeDialog: () => void) => {
    if (!hasMoreServers) {
      closeDialog()
      navigate({ to: '/group/$name', params: { name: group.name } })
      onClose()
      return
    }

    setWizardState((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
    }))
  }

  if (isRemoteServer(currentServer)) {
    return (
      <DialogFormRemoteRegistryMcp
        key={currentServer.name}
        server={currentServer}
        isOpen={isOpen}
        closeDialog={onClose}
        onSubmitSuccess={handleNext}
        hardcodedGroup={group.name}
        actionsSubmitLabel={hasMoreServers ? 'Next' : 'Finish'}
        description={`Installing server ${wizardState.currentIndex + 1} of ${servers.length}`}
      />
    )
  }

  return (
    <FormRunFromRegistry
      key={currentServer.name}
      server={currentServer}
      isOpen={isOpen}
      onOpenChange={onClose}
      onSubmitSuccess={handleNext}
      hardcodedGroup={group.name}
      actionsSubmitLabel={hasMoreServers ? 'Next' : 'Finish'}
      description={`Installing server ${wizardState.currentIndex + 1} of ${servers.length}`}
    />
  )
}
