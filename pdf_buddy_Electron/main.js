const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });

  win.loadFile('index.html');
}

ipcMain.on('speak-native', (event, text) => {
  if (!text) return;
  // Use macOS 'say' command with an English voice (e.g., Samantha)
  const escapedText = text.replace(/"/g, '\\"');
  exec(`say -v Samantha "${escapedText}"`);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
