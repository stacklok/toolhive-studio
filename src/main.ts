import { app, BrowserWindow, Tray, ipcMain } from "electron";
import path from "node:path";
import { existsSync } from "node:fs";
import started from "electron-squirrel-startup";
import { spawn } from "node:child_process";
import { initTray } from "./system-tray";
import { setAutoLaunch, getAutoLaunchStatus } from "./auto-launch";

// Determine the binary path for both dev and prod
const binName = process.platform === "win32" ? "thv.exe" : "thv";
const binPath = app.isPackaged
  ? path.join(
      process.resourcesPath,
      "bin",
      `${process.platform}-${process.arch}`,
      binName,
    )
  : path.resolve(
      __dirname,
      "..",
      "..",
      "bin",
      `${process.platform}-${process.arch}`,
      binName,
    );

console.log(`ToolHive binary path: ${binPath}`);
console.log(`Binary file exists: ${existsSync(binPath)}`);

// For cleaning up
let toolhiveProcess: ReturnType<typeof spawn> | undefined;
let tray: Tray | null = null;

function startToolhive() {
  // Check if binary exists before trying to spawn
  if (!existsSync(binPath)) {
    console.error(`ToolHive binary not found at: ${binPath}`);
    return;
  }

  console.log(`Starting ToolHive from: ${binPath}`);
  toolhiveProcess = spawn(binPath, ["serve", "--openapi"], {
    stdio: "ignore", // or 'inherit' or ['pipe', ...] for logs
    detached: true,
  });

  toolhiveProcess.on("error", (error) => {
    console.error("Failed to start ToolHive:", error);
  });

  toolhiveProcess.unref();
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Check if app should start hidden
const shouldStartHidden =
  process.argv.includes("--hidden") || process.argv.includes("--start-hidden");

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: !shouldStartHidden, // Don't show window if starting hidden
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false, // TODO: urgently remove this
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/`);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (!shouldStartHidden) {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
};

let mainWindow: BrowserWindow | null = null;

app.on("ready", () => {
  startToolhive();
  mainWindow = createWindow();
});

app.whenReady().then(() => {
  tray = initTray({
    toolHiveIsRunning: !!toolhiveProcess,
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  } else if (mainWindow) {
    mainWindow.show();
  }
});

app.on("will-quit", () => {
  if (toolhiveProcess && !toolhiveProcess.killed) {
    toolhiveProcess.kill();
  }
  if (tray) {
    tray.destroy();
  }
});

// IPC handlers for auto-launch management
ipcMain.handle("get-auto-launch-status", () => {
  return getAutoLaunchStatus();
});

ipcMain.handle("set-auto-launch", (_event, enabled: boolean) => {
  setAutoLaunch(enabled);
  return getAutoLaunchStatus(); // Return the new status
});

// IPC handlers for app control
ipcMain.handle("show-app", () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.handle("hide-app", () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.handle("quit-app", () => {
  app.quit();
});
