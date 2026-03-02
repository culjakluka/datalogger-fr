const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onCANData: (callback) => ipcRenderer.on('can-data', (event, data) => callback(data)),
    showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
    saveCSV: (filePath, data) => ipcRenderer.invoke('save-csv', filePath, data)
});