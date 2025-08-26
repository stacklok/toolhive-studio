import { test, expect, _electron as electron } from '@playwright/test'

interface DialogCall {
  message?: string
  buttons?: string[]
  [key: string]: unknown
}

test.describe('Auto Update Flow', () => {
  test('shows update dialog when autoUpdater emits update-downloaded', async () => {
    const app = await electron.launch({
      args: ['.'],
    })

    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    await window.waitForTimeout(1000)

    // Stub dialog.showMessageBox and capture calls
    const dialogCalls = (await app.evaluate(({ autoUpdater, dialog }) => {
      const calls: unknown[][] = []

      // Stub the dialog method
      const originalShowMessageBox = dialog.showMessageBox
      dialog.showMessageBox = async (...args: unknown[]) => {
        calls.push(args)
        // Simulate user clicking "Later" (button index 1)
        return { response: 1, checkboxChecked: false }
      }

      // Emit the update event
      autoUpdater.emit('update-downloaded', null, null, '1.2.3-e2e-test')

      // Return the calls after a short delay to allow processing
      return new Promise((resolve) => {
        setTimeout(() => {
          // Restore original method
          dialog.showMessageBox = originalShowMessageBox
          resolve(calls)
        }, 1000)
      })
    })) as unknown as unknown[][]

    // Verify dialog was called
    expect(dialogCalls).toHaveLength(1)

    // Verify dialog parameters
    const [, dialogOptions] = dialogCalls[0] as [unknown, DialogCall]
    expect(dialogOptions.message).toContain('1.2.3-e2e-test')
    expect(dialogOptions.buttons).toEqual(['Restart', 'Later'])

    await app.close()
  })

  test('handles update errors', async () => {
    const app = await electron.launch({
      args: ['.'],
    })

    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    await window.waitForTimeout(1000)

    // Emit an error event directly to test error handling
    await app.evaluate(({ autoUpdater }) => {
      autoUpdater.emit('error', new Error('E2E test update error'))
    })

    await window.waitForTimeout(1000)

    // Verify the app handled the error gracefully and is still running
    const title = await window.title()
    expect(title).toBeTruthy()
    await app.close()
  })

  test('shows restart dialog with correct options', async () => {
    const app = await electron.launch({
      args: ['.'],
    })

    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    await window.waitForTimeout(1000)

    // Test that the dialog appears with correct options (simpler E2E test)
    const dialogCalls = (await app.evaluate(({ autoUpdater, dialog }) => {
      const calls: unknown[][] = []

      // Stub dialog to capture the call and simulate "Later" to avoid installation
      dialog.showMessageBox = async (...args: unknown[]) => {
        calls.push(args)
        return Promise.resolve({ response: 1, checkboxChecked: false }) // "Later"
      }

      // Emit the update event
      autoUpdater.emit('update-downloaded', null, null, '1.2.3-dialog-test')

      // Return dialog calls after processing
      return new Promise((resolve) => {
        setTimeout(() => resolve(calls), 1000)
      })
    })) as unknown as unknown[][]

    // Verify dialog was called with correct options
    expect(dialogCalls).toHaveLength(1)
    const [, dialogOptions] = dialogCalls[0] as [unknown, DialogCall]
    expect(dialogOptions.message).toContain('1.2.3-dialog-test')
    expect(dialogOptions.buttons).toEqual(['Restart', 'Later'])

    await app.close()
  })

  test('handles different update events in sequence', async () => {
    const app = await electron.launch({
      args: ['.'],
    })

    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    await window.waitForTimeout(1000)

    // Test the full update sequence with stubbed dialog
    const dialogCalls = (await app.evaluate(({ autoUpdater, dialog }) => {
      const calls: unknown[][] = []

      // Stub dialog for the final update-downloaded event
      dialog.showMessageBox = async (...args: unknown[]) => {
        calls.push(args)
        return { response: 1, checkboxChecked: false } // "Later"
      }

      // Simulate the full sequence
      setTimeout(() => autoUpdater.emit('checking-for-update'), 100)
      setTimeout(
        () => autoUpdater.emit('update-available', { version: '1.2.3' }),
        200
      )
      setTimeout(
        () => autoUpdater.emit('download-progress', { percent: 50 }),
        300
      )
      setTimeout(
        () =>
          autoUpdater.emit(
            'update-downloaded',
            null,
            null,
            '1.2.3-sequence-test'
          ),
        500
      )

      // Return dialog calls after sequence completes
      return new Promise((resolve) => {
        setTimeout(() => resolve(calls), 1000)
      })
    })) as unknown as unknown[][]

    // Verify the final dialog was shown
    expect(dialogCalls).toHaveLength(1)
    expect((dialogCalls[0][1] as DialogCall).message).toContain(
      '1.2.3-sequence-test'
    )

    await app.close()
  })

  test('shows update toast in UI and handles restart button click', async () => {
    const app = await electron.launch({
      args: ['.'],
    })

    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    await window.waitForTimeout(1000)

    // Set up stubs and emit event to trigger toast
    await app.evaluate(({ autoUpdater, dialog }) => {
      // Store original functions in global scope for cleanup
      ;(
        globalThis as unknown as { __originalQuitAndInstall: unknown }
      ).__originalQuitAndInstall = autoUpdater.quitAndInstall
      ;(
        globalThis as unknown as { __originalShowMessageBox: unknown }
      ).__originalShowMessageBox = dialog.showMessageBox
      ;(
        globalThis as unknown as { __quitAndInstallCalled: boolean }
      ).__quitAndInstallCalled = false

      // Stub quitAndInstall to prevent actual restart
      autoUpdater.quitAndInstall = () => {
        ;(
          globalThis as unknown as { __quitAndInstallCalled: boolean }
        ).__quitAndInstallCalled = true
      }

      // Stub dialog.showMessageBox to simulate "Later" response (which shows the toast)
      dialog.showMessageBox = async () => {
        return Promise.resolve({ response: 1, checkboxChecked: false }) // "Later"
      }

      // Emit the update event
      autoUpdater.emit('update-downloaded', null, null, '1.2.3-toast-test')
    })

    // Wait longer for the toast to appear after the dialog flow
    await window.waitForTimeout(2000)

    // Wait for the specific update toast to appear and verify its content
    const updateToast = window
      .locator('[data-sonner-toast]')
      .filter({ hasText: 'Update downloaded and ready to install' })
    await expect(updateToast).toBeVisible({ timeout: 10000 })
    await expect(updateToast).toContainText(
      'Update downloaded and ready to install'
    )

    // Click the "Restart now" button in the update toast specifically
    const restartButton = updateToast
      .locator('button')
      .filter({ hasText: 'Restart now' })
    await expect(restartButton).toBeVisible()

    // Handle the confirmation dialog that appears when clicking restart
    window.on('dialog', async (dialog) => {
      await dialog.accept()
    })

    await restartButton.click()

    // Wait for the restart flow to complete
    await window.waitForTimeout(1000)

    // Verify quitAndInstall was called and clean up
    const wasQuitAndInstallCalled = await app.evaluate(
      ({ autoUpdater, dialog }) => {
        const called = (
          globalThis as unknown as { __quitAndInstallCalled: boolean }
        ).__quitAndInstallCalled

        // Clean up
        autoUpdater.quitAndInstall = (
          globalThis as unknown as { __originalQuitAndInstall: unknown }
        ).__originalQuitAndInstall as typeof autoUpdater.quitAndInstall
        dialog.showMessageBox = (
          globalThis as unknown as { __originalShowMessageBox: unknown }
        ).__originalShowMessageBox as typeof dialog.showMessageBox
        delete (globalThis as unknown as { __originalQuitAndInstall?: unknown })
          .__originalQuitAndInstall
        delete (globalThis as unknown as { __originalShowMessageBox?: unknown })
          .__originalShowMessageBox
        delete (globalThis as unknown as { __quitAndInstallCalled?: boolean })
          .__quitAndInstallCalled

        return called
      }
    )
    expect(wasQuitAndInstallCalled).toBe(true)

    await app.close()
  })
})
