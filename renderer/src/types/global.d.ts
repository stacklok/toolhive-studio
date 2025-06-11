import { ElectronAPI } from '../../../preload/src/preload'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
