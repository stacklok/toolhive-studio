import { ipcRenderer } from 'electron'

export const dialogsApi = {
  selectFile: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-file'),
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-folder'),
}

export interface DialogsAPI {
  selectFile: () => Promise<string | null>
  selectFolder: () => Promise<string | null>
}
