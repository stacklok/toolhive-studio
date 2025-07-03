import { useEffect } from 'react'
import { useConfirmQuit } from '@/common/hooks/use-confirm-quit'

export function QuitConfirmationListener() {
  const confirmQuit = useConfirmQuit()

  useEffect(() => {
    // Listen for quit confirmation request from tray
    const cleanup = window.electronAPI.onShowQuitConfirmation(async () => {
      const confirmed = await confirmQuit()
      if (confirmed) {
        await window.electronAPI.quitApp()
      }
    })

    return cleanup
  }, [confirmQuit])

  // This component doesn't render anything visible
  return null
}
