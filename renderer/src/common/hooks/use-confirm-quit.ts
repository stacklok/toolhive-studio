import { useConfirm } from './use-confirm'

export function useConfirmQuit() {
  const confirm = useConfirm()
  return async () => {
    return confirm('Shutting down ToolHive stops all MCP servers.', {
      title: 'Quit ToolHive',
      isDestructive: true,
      buttons: { yes: 'Quit', no: 'Cancel' },
      doNotShowAgain: {
        label: "Don't ask me again",
        id: 'confirm_quit',
      },
    })
  }
}
