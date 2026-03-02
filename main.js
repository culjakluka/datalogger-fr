const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { startMockCAN, emitter } = require('./mockCAN');
const { decodeMessage } = require('./decoder');
const { updateState } = require('./mergeFrames');
const fs = require('fs');
const { stringify } = require('csv-stringify/sync');

function exportCSV(data, filePath) {
  const csv = stringify(data, { header: true });
  fs.writeFileSync(filePath, csv);
}

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}


app.whenReady().then(() => {
  createWindow();
  startMockCAN();

  emitter.on('message', msg => {
    const decoded = decodeMessage(msg);

    if (decoded) {
      const merged = updateState(decoded);
      mainWindow.webContents.send('can-data', merged);
    }
  });
});

ipcMain.handle('save-csv', (event, filePath, data) => {
  exportCSV(data, filePath);
});

ipcMain.handle('show-save-dialog', async () => {
  const { filePath } = await dialog.showSaveDialog({
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  return filePath;
});