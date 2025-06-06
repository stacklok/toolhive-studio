// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

// Expose auto-launch functionality to renderer
contextBridge.exposeInMainWorld("electronAPI", {
  // Auto-launch management
  getAutoLaunchStatus: () => ipcRenderer.invoke("get-auto-launch-status"),
  setAutoLaunch: (enabled: boolean) =>
    ipcRenderer.invoke("set-auto-launch", enabled),

  // App control
  showApp: () => ipcRenderer.invoke("show-app"),
  hideApp: () => ipcRenderer.invoke("hide-app"),
  quitApp: () => ipcRenderer.invoke("quit-app"),

  // ToolHive port
  getToolhivePort: () => ipcRenderer.invoke("get-toolhive-port"),
});

// Type definitions for the exposed API
export interface ElectronAPI {
  getAutoLaunchStatus: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  showApp: () => Promise<void>;
  hideApp: () => Promise<void>;
  quitApp: () => Promise<void>;
  getToolhivePort: () => Promise<number | undefined>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
