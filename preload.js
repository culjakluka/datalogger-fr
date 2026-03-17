const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    connectCAN: (iface) => ipcRenderer.invoke('connect-can', iface),
    disconnectCAN: () => ipcRenderer.invoke('disconnect-can'),
    onCANData: (callback) => ipcRenderer.on('can-data', (_event, payload) => callback(payload)),
    showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
    saveCSV: (filePath, data) => ipcRenderer.invoke('save-csv', filePath, data),
    onCANStatus: (callback) => ipcRenderer.on('can-status', (_event, payload) => callback(payload)),
    onCANEvents: (callback) => ipcRenderer.on('can-events', (_event, payload) => callback(payload)),
    openLogFile: () => ipcRenderer.invoke('open-log-file'),
    importMemoratorLog: (filePath) => ipcRenderer.invoke('import-memorator-log', filePath)
});