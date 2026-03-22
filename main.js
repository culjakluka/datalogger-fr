const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { decodeMessage } = require('./decoder');
const { updateState, resetState } = require('./mergeFrames');
const canService = require('./canInterface');
const { exportCSV } = require('./export');
const { getCanInterfaces } = require('./scanCAN');
const { kmfToCsv } = require('./kvaserKMF');

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

function sendToRenderer(channel, payload) {
  if(mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function handleCANMessage(rawMsg) {
  const decoded = decodeMessage(rawMsg);
  if(!decoded) return;
  const result = updateState(decoded);
  if(result.row) sendToRenderer('can-data', result.row);
  if(result.events && result.events.length > 0) sendToRenderer('can-events', result.events);
}

// Parse CSV text into array of row objects
function parseCsv(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]?.trim() || '');
    return obj;
  });
}

// Convert a CSV row into a fake CAN message that decoder.js understands
function csvRowToMsg(row) {
  const id = parseInt(row.id, 16);
  const dlc = parseInt(row.dlc);
  const byteKeys = ['byte0','byte1','byte2','byte3','byte4','byte5','byte6','byte7'];
  const data = Buffer.from(
    byteKeys.slice(0, dlc).map(k => row[k] ? parseInt(row[k], 16) : 0)
  );
  return {
    id,
    dlc,
    data,
    timestamp_ms: Math.round(parseInt(row.timestamp) / 1000) // microseconds to ms
  };
}

// Decode and merge all CSV rows using existing decoder + mergeFrames
function decodeCsvRows(csvText) {
  const rows = parseCsv(csvText);

  // Reset merge state so log file decode is isolated
  resetState();

  const merged = [];
  for (const row of rows) {
    const msg = csvRowToMsg(row);
    const decoded = decodeMessage(msg);
    if (!decoded) continue;
    // Override timestamp with the one from the log file
    decoded.timestamp_ms = msg.timestamp_ms;
    const result = updateState(decoded);
    if (result.row) merged.push(result.row);
  }

  // Reset again so live CAN state is clean after
  resetState();

  return merged;
}

app.whenReady().then(() => {
  console.log('CAN interfaces:', getCanInterfaces());
  createWindow();
});

app.on('window-all-closed', () => {
  canService.disconnect();
  if(process.platform !== 'darwin') app.quit();
});

ipcMain.handle('connect-can', async (_event, iface) => {
  const selectedInterface = (iface || 'vcan0').trim();
  try {
    resetState();
    canService.connect(selectedInterface, handleCANMessage);
    const status = { connected: true, iface: selectedInterface, message: `Connected to ${selectedInterface}` };
    sendToRenderer('can-status', status);
    return status;
  } catch (error) {
    canService.disconnect();
    const status = { connected: false, iface: selectedInterface, error: error.message || String(error), message: `Failed to connect to ${selectedInterface}` };
    sendToRenderer('can-status', status);
    return status;
  }
});

ipcMain.handle('disconnect-can', async () => {
  const previous = canService.getActiveInterface() || '';
  canService.disconnect();
  resetState();
  const status = { connected: false, iface: previous, message: 'Disconnected' };
  sendToRenderer('can-status', status);
  return status;
});

ipcMain.handle('save-csv', async (_event, filePath, data) => {
  exportCSV(data, filePath);
  return { ok: true };
});

ipcMain.handle('get-can-interfaces', async () => {
  return getCanInterfaces();
});

ipcMain.handle('show-save-dialog', async () => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    defaultPath: 'can_export.csv'
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('kmf-to-csv', async (_event, folderPath) => {
  const tmpDir = path.join(__dirname, 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
  const tmpFile = path.join(tmpDir, `kmf_output_${Date.now()}.csv`);
  try {
    await kmfToCsv(folderPath, tmpFile);
    const content = fs.readFileSync(tmpFile, 'utf8');
    const rows = decodeCsvRows(content);
    return { ok: true, rows };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
});
