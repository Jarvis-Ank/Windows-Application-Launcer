// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectAppPath: () => ipcRenderer.invoke('select-app-path'),
    getAppIcon: (appPath) => ipcRenderer.invoke('get-app-icon', appPath),
    saveApps: (apps) => ipcRenderer.invoke('save-apps', apps),
    loadApps: () => ipcRenderer.invoke('load-apps'),
    saveGroups: (groups) => ipcRenderer.invoke('save-groups', groups), // New
    loadGroups: () => ipcRenderer.invoke('load-groups'), // New
    launchApp: (appPath) => ipcRenderer.invoke('launch-app', appPath),
    discoverCommonApps: () => ipcRenderer.invoke('discover-common-apps') // New
});