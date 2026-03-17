function parseHexBytes(hexString) {
  if (!hexString) return Buffer.alloc(0);

  const bytes = hexString
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(x => parseInt(x, 16));

  return Buffer.from(bytes);
}

function parseTimestampToMs(value) {
  if (!value) return 0;

  const num = Number(String(value).trim());

  if (Number.isNaN(num)) return 0;

  // Ako je vrijeme u sekundama (npr. 0.050), pretvori u ms
  if (num < 100000) {
    return Math.round(num * 1000);
  }

  // Ako je već veliki broj, pretpostavi da je već ms
  return Math.round(num);
}

function parseCanId(value) {
  if (!value) return 0;

  const text = String(value).trim();

  if (text.startsWith('0x') || text.startsWith('0X')) {
    return parseInt(text, 16);
  }

  // Ako je hex bez 0x, npr. "100"
  if (/^[0-9A-Fa-f]+$/.test(text) && /[A-Fa-f]/.test(text)) {
    return parseInt(text, 16);
  }

  return Number(text);
}

function getColumnIndex(headers, possibleNames) {
  for (const name of possibleNames) {
    const idx = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseMemoratorCsv(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());

  const timeIdx = getColumnIndex(headers, ['timestamp_ms', 'time', 'timestamp']);
  const idIdx = getColumnIndex(headers, ['id', 'canid', 'identifier']);
  const dataIdx = getColumnIndex(headers, ['data', 'payload']);

  if (timeIdx === -1 || idIdx === -1 || dataIdx === -1) {
    throw new Error('CSV header does not contain required columns for time, id and data');
  }

  const frames = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',').map(x => x.trim());
    if (parts.length <= Math.max(timeIdx, idIdx, dataIdx)) continue;

    const timestamp_ms = parseTimestampToMs(parts[timeIdx]);
    const id = parseCanId(parts[idIdx]);
    const data = parseHexBytes(parts[dataIdx]);

    frames.push({ timestamp_ms, id, data });
  }

  return frames;
}

module.exports = { parseMemoratorCsv };