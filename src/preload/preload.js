const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('autocanva', {
  pickImage: () => ipcRenderer.invoke('dialog:pickImage'),
  saveProject: (data) => ipcRenderer.invoke('project:save', data),
  saveProjectAs: (data) => ipcRenderer.invoke('project:saveAs', data),
  loadProject: () => ipcRenderer.invoke('project:loadRecent'),
  openProject: () => ipcRenderer.invoke('project:open'),
  newProject: () => ipcRenderer.invoke('project:new'),
  saveExport: (data) => ipcRenderer.invoke('project:saveExport', data),

  onMenuEvent: (callback) => {
    ipcRenderer.on('menu:new', () => callback('new'));
    ipcRenderer.on('menu:open', () => callback('open'));
    ipcRenderer.on('menu:saveAs', () => callback('saveAs'));
    ipcRenderer.on('menu:export', () => callback('export'));
  },
});
