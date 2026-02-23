const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // General
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    getVersion: () => ipcRenderer.invoke('get-app-version'),

    // Listeners (if needed later)
    on: (channel, func) => {
        const subscription = (_event, ...args) => func(...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
    }
});
