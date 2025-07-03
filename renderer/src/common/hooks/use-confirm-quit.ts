import { useConfirm } from './use-confirm'

export function useConfirmQuit() {
  const confirm = useConfirm()
  return async () => {
    return confirm(
      'Shutting down ToolHive Studio will also shut down all your MCP servers.',
      {
        title: 'Quitting will shut MCPs down',
        isDestructive: true,
        buttons: { yes: 'Quit', no: 'Cancel' },
      }
    )
  }
}
