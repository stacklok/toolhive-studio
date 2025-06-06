import {
  Menu,
  Tray,
  app,
  nativeImage,
  nativeTheme,
  BrowserWindow,
} from "electron";
import path from "node:path";
import { existsSync } from "node:fs";

export const initTray = ({
  toolHiveIsRunning,
}: {
  toolHiveIsRunning: boolean;
}) => {
  const getIconPath = () => {
    const isDarkMode = nativeTheme.shouldUseDarkColors;
    const iconName = isDarkMode ? "tray-icon-dark.png" : "tray-icon.png";

    if (app.isPackaged) {
      return path.join(process.resourcesPath, "icons", iconName);
    }
    return path.join(__dirname, "..", "..", "icons", iconName);
  };

  try {
    const iconPath = getIconPath();

    if (!existsSync(iconPath)) {
      console.error(`Tray icon file not found at: ${iconPath}`);
      throw new Error(`No suitable icon found`);
    }

    const image = nativeImage.createFromPath(iconPath);

    const tray = new Tray(image);
    setupTrayMenu(tray, toolHiveIsRunning);
    return tray;
  } catch (error) {
    console.error("Failed to create tray:", error);
    throw error;
  }
};

function setupTrayMenu(tray: Tray, toolHiveIsRunning: boolean) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: toolHiveIsRunning
        ? "🟢 ToolHive is running"
        : "🔴 ToolHive is stopped",
      type: "normal",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Show App",
      type: "normal",
      click: () => {
        // TODO: check if there is a better way
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Hide App",
      type: "normal",
      click: () => {
        // TODO: check if there is a better way
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.hide();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit App",
      type: "normal",
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip("This is my application.");
  tray.setContextMenu(contextMenu);
}
