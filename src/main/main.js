const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let recentPath = null;
const userDataPath = app.getPath('userData');
const recentFilePath = path.join(userDataPath, 'recent.json');

function loadRecentFromDisk() {
  try {
    if (fs.existsSync(recentFilePath)) {
      recentPath = JSON.parse(fs.readFileSync(recentFilePath, 'utf-8')).path || null;
    }
  } catch (_) {}
}

function saveRecentToDisk(p) {
  try {
    const dir = path.dirname(recentFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(recentFilePath, JSON.stringify({ path: p }), 'utf-8');
    recentPath = p;
  } catch (_) {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0e0e10',
    title: 'AutoCanva',
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu:new'),
        },
        {
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:open'),
        },
        {
          label: 'Save As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu:saveAs'),
        },
        { type: 'separator' },
        {
          label: 'Export…',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu:export'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  loadRecentFromDisk();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('dialog:pickImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select reference image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const name = path.basename(filePath);
  const url = 'file://' + filePath.replace(/\\/g, '/');
  return { url, name };
});

ipcMain.handle('project:save', async (_evt, jsonData) => {
  if (recentPath) {
    try {
      fs.writeFileSync(recentPath, jsonData, 'utf-8');
      return true;
    } catch (_) { return false; }
  }
  return false;
});

ipcMain.handle('project:saveAs', async (_evt, jsonData) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save project as',
    defaultPath: recentPath || 'untitled.autocanva',
    filters: [{ name: 'AutoCanva Project', extensions: ['autocanva'] }],
  });
  if (result.canceled || !result.filePath) return null;
  try {
    fs.writeFileSync(result.filePath, jsonData, 'utf-8');
    saveRecentToDisk(result.filePath);
    mainWindow.setTitle('AutoCanva - ' + path.basename(result.filePath));
    return path.basename(result.filePath);
  } catch (_) { return null; }
});

ipcMain.handle('project:loadRecent', async () => {
  if (recentPath && fs.existsSync(recentPath)) {
    try {
      return fs.readFileSync(recentPath, 'utf-8');
    } catch (_) {}
  }
  return null;
});

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open project',
    filters: [{ name: 'AutoCanva Project', extensions: ['autocanva'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  try {
    const data = fs.readFileSync(result.filePaths[0], 'utf-8');
    saveRecentToDisk(result.filePaths[0]);
    mainWindow.setTitle('AutoCanva - ' + path.basename(result.filePaths[0]));
    return data;
  } catch (_) { return null; }
});

ipcMain.handle('project:new', async () => {
  recentPath = null;
  mainWindow.setTitle('AutoCanva');
  return true;
});

ipcMain.handle('project:saveExport', async (_evt, jsonData) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export layout as JSON',
    defaultPath: 'layout-export.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return false;
  try {
    fs.writeFileSync(result.filePath, jsonData, 'utf-8');
    return true;
  } catch (_) { return false; }
});
