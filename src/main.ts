/// <reference types="../forge.env.d.ts" />

import { app, BrowserWindow } from "electron";
import path from "node:path";
import { existsSync } from "node:fs";
import started from "electron-squirrel-startup";
import { spawn } from "node:child_process";

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

// For cleaning up the process
let toolhiveProcess: ReturnType<typeof spawn> | undefined;

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

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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

  mainWindow.webContents.openDevTools();
};

app.on("ready", () => {
  startToolhive();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("will-quit", () => {
  if (toolhiveProcess && !toolhiveProcess.killed) {
    toolhiveProcess.kill();
  }
});

// If you want, you can add error handling, port polling, etc.
// You can also pass arguments to toolhive: spawn(binPath, ['--port', '1234'], ...)
