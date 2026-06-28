const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('autocanva', {
  pickImage: () => ipcRenderer.invoke('dialog:pickImage'),
  saveProject: (data) => ipcRenderer.invoke('project:save', data),
  loadProject: () => ipcRenderer.invoke('project:load'),
});