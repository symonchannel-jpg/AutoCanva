const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0e0e10',
    title: 'AutoCanva',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('dialog:pickImage', async () => {
  // Phase 2: dialog.showOpenDialog -> return { url, name } or null
  return null;
});

ipcMain.handle('project:save', async (_evt, data) => {
  // Phase 5: write JSON to last project path / show save dialog
  return false;
});

ipcMain.handle('project:load', async () => {
  // Phase 5: read last project (electron-store) -> return state or null
  return null;
});