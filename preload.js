// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectAppPath: () => ipcRenderer.invoke('select-app-path'),
    getAppIcon: (appPath) => ipcRenderer.invoke('get-app-icon', appPath), // New API
    saveApps: (apps) => ipcRenderer.invoke('save-apps', apps),
    loadApps: () => ipcRenderer.invoke('load-apps'),
    launchApp: (appPath) => ipcRenderer.invoke('launch-app', appPath)
});