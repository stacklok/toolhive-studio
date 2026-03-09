import { app } from 'electron'

export function register() {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
