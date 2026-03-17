const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { decodeMessage } = require('./decoder');
const { updateState, resetState } = require('./mergeFrames');
const canService = require('./canInterface');
const { exportCSV } = require('./export');
const { startMockCAN, emitter } = require('./mockCAN');
//const { startLiveCAN } = require('./liveCAN');
const { decodeMessage, resetDecoderState } = require('./decoder');
const { updateState, resetMergedState } = require('./mergeFrames');
const fs = require('fs');
const { stringify } = require('csv-stringify/sync');
const { parseMemoratorCsv } = require('./memoratorParser');

function exportCSV(data, filePath) {
  const csv = stringify(data, { header: true });
  fs.writeFileSync(filePath, csv);
}

let mainWindow;

function resetProcessingState() {
  resetDecoderState();
  resetMergedState();
}

function processRawFrame(msg) {
  const decoded = decodeMessage(msg);

  if (!decoded) return null;

  return updateState(decoded);
}

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

function sendToRenderer(channel, payload) {
  if(mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function handleCANMessage(rawMsg) {
  const decoded = decodeMessage(rawMsg);
  if(!decoded) return;

  const result = updateState(decoded);

  if(result.row) {
    sendToRenderer('can-data', result.row);
  }

  if (result.events && result.events.length > 0) {
    sendToRenderer('can-events', result.events);
  }
}


app.whenReady().then(() => {
  createWindow();
  resetProcessingState();
  /*
  startLiveCAN((msg) => {
  const merged = processRawFrame(msg);

  if (merged) {
    mainWindow.webContents.send('can-data', merged);
  }
});
  */
  startMockCAN();
  
  emitter.on('message', msg => {
    const merged = processRawFrame(msg);

    if (merged) {
      mainWindow.webContents.send('can-data', merged);
    }
  });
});

app.on('window-all-closed', () => {
  canService.disconnect();
  if(process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('connect-can', async (_event, iface) => {
  const selectedInterface = (iface || 'vcan0').trim();

  try {
    resetState();
    canService.connect(selectedInterface, handleCANMessage);

    const status = {
      connected: true,
      iface: selectedInterface,
      message: `Connected to ${selectedInterface}`
    };

    sendToRenderer('can-status', status);
    return status;
  } catch (error) {
    canService.disconnect();

    const status = {
      connected: false,
      iface: selectedInterface,
      error: error.message || String(error),
      message: `Failed to connect to ${selectedInterface}`
    };

    sendToRenderer('can-status', status);
    return status;
  }
});

ipcMain.handle('disconnect-can', async () => {
  const previous = canService.getActiveInterface() || '';
  canService.disconnect();
  resetState();
  
  const status = {
    connected: false,
    iface: previous,
    message: 'Disconnected'
  };

    sendToRenderer('can-status', status);
    return status;
});

ipcMain.handle('save-csv', async (_event, filePath, data) => {
  exportCSV(data, filePath);
  return { ok: true };
});

ipcMain.handle('show-save-dialog', async () => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    defaultPath: 'can_export.csv'
  });

  return result.canceled ? null : result.filePath;
  return filePath;
});

ipcMain.handle('open-log-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Log files', extensions: ['csv', 'txt', 'log'] },
      { name: 'All files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths.length) return null;

  return result.filePaths[0];
});

ipcMain.handle('import-memorator-log', async (event, filePath) => {
  if (!filePath) return [];

  resetProcessingState();

  const content = fs.readFileSync(filePath, 'utf-8');
  const frames = parseMemoratorCsv(content);

  const results = [];

  for (const frame of frames) {
    const merged = processRawFrame(frame);
    if (merged) results.push(merged);
  }

  return results;
});