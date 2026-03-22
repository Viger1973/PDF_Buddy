const { ipcRenderer } = require('electron');
window.ipcRenderer = ipcRenderer; // Optional, but helps if nodeIntegration is tricky
