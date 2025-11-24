import { useState, useEffect, useCallback } from 'react'
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
  const createGroupMutation = useMutationCreateGroup({ successMsg: null })

  const handleClose = useCallback(() => {
    setWizardState({ currentIndex: 0, isGroupCreated: false })
    onClose()
  }, [onClose])

  // Create group when dialog opens and group hasn't been created yet
  useEffect(() => {
    if (isOpen && !wizardState.isGroupCreated && group?.name) {
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
          handleClose()
        })
    }
  }, [
    isOpen,
    wizardState.isGroupCreated,
    group?.name,
    createGroupMutation,
    handleClose,
  ])

  if (!isOpen || servers.length === 0 || !group?.name) return null

  const currentServer = servers[wizardState.currentIndex]
  if (!currentServer) return null

  const hasMoreServers = wizardState.currentIndex < servers.length - 1

  // It is sufficient to only check the status of the last server because:
  // 1. All servers have been installed and will appear in the group
  // 2. Users can monitor the progress of all servers in the group view
  // 3. The group is not yet activated in any clients, so there's no expectation
  //    that all servers are immediately ready for use
  const handleNext = (closeDialog: () => void) => {
    if (!hasMoreServers) {
      closeDialog()
      handleClose()
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
        closeDialog={handleClose}
        onSubmitSuccess={handleNext}
        hardcodedGroup={group.name}
        actionsSubmitLabel={hasMoreServers ? 'Next' : 'Finish'}
        description={`Installing server ${wizardState.currentIndex + 1} of ${servers.length}`}
        quietly={hasMoreServers}
        customSuccessMessage={
          hasMoreServers
            ? undefined
            : `Group "${group.name}" created successfully`
        }
        customLoadingMessage={
          hasMoreServers ? undefined : `Creating "${group.name}" group...`
        }
      />
    )
  }

  return (
    <FormRunFromRegistry
      key={currentServer.name}
      server={currentServer}
      isOpen={isOpen}
      onOpenChange={handleClose}
      onSubmitSuccess={handleNext}
      hardcodedGroup={group.name}
      actionsSubmitLabel={hasMoreServers ? 'Next' : 'Finish'}
      description={`Installing server ${wizardState.currentIndex + 1} of ${servers.length}`}
      quietly={hasMoreServers}
      customSuccessMessage={
        hasMoreServers
          ? undefined
          : `Group "${group.name}" created successfully`
      }
      customLoadingMessage={
        hasMoreServers ? undefined : `Creating "${group.name}" group...`
      }
    />
  )
}
