let dataBuffer = [];

document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.querySelector('#dataTable tbody');
  const tbodyLog = document.querySelector('#dataTableLog tbody');

  const socCtx = document.getElementById('socChart');
  const gasCtx = document.getElementById('gasChart');
  const pwrLimitCtx = document.getElementById('powerLimitChart');
  const pwrReqCtx = document.getElementById('powerRequestChart');

  const socCtxLog = document.getElementById('socChartLog');
  const gasCtxLog = document.getElementById('gasChartLog');
  const pwrLimitCtxLog = document.getElementById('powerLimitChartLog');
  const pwrReqCtxLog = document.getElementById('powerRequestChartLog');

  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const exportBtn = document.getElementById('exportBtn');
  const interfaceInput = document.getElementById('canInterface');
  const interfaceList = document.getElementById('canInterfaceList');
  const statusEl = document.getElementById('connectionStatus');

  const dropzone = document.getElementById('dropzone');
  const dropzoneText = document.getElementById('dropzone-text');
  const dropzonePath = document.getElementById('dropzone-path');
  const convertBtn = document.getElementById('convertBtn');
  const convertStatus = document.getElementById('convertStatus');

  let selectedFolderPath = null;

  // ---- Mode switching ----
  function showMode(id) {
    document.querySelectorAll('.mode').forEach(m => m.style.display = 'none');
    document.getElementById('mode-' + id).style.display = 'block';
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === id);
    });
  }
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => showMode(btn.dataset.mode));
  });
  showMode('live');

  // ---- Tab switching ----
  function showTab(tabId, group) {
    document.querySelectorAll('.tab').forEach(t => {
      if (t.id.endsWith('-' + group)) t.style.display = 'none';
    });
    document.getElementById(tabId).style.display = 'block';
    document.querySelectorAll(`[data-group="${group}"]`).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
  }
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab, btn.dataset.group));
  });
  showTab('table-live', 'live');
  showTab('table-log', 'log');

  // ---- CAN interfaces ----
  const ifaces = await window.api.getCanInterfaces();
  ifaces.forEach((iface) => {
    const option = document.createElement('option');
    option.value = iface;
    interfaceList.appendChild(option);
  });
  if (ifaces.length > 0) interfaceInput.value = ifaces[0];

  // ---- Chart factory ----
  const commonOptions = {
    responsive: true,
    animation: false,
    interaction: { mode: 'nearest', intersect: false },
    scales: {
      x: { type: 'linear', title: { display: true, text: 'Time (ms)' } }
    },
    plugins: {
      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
        pan: { enabled: true, mode: 'x' }
      }
    }
  };
  function makeChart(ctx, label) {
    return new Chart(ctx, {
      type: 'line',
      data: { datasets: [{ label, data: [], borderWidth: 2, tension: 0.1 }] },
      options: commonOptions
    });
  }

  const socChart = makeChart(socCtx, 'Battery SoC (%)');
  const gasChart = makeChart(gasCtx, 'Gas Request (%)');
  const powerLimitChart = makeChart(pwrLimitCtx, 'Power Limit (W)');
  const powerReqChart = makeChart(pwrReqCtx, 'Power Request (W)');

  const socChartLog = makeChart(socCtxLog, 'Battery SoC (%)');
  const gasChartLog = makeChart(gasCtxLog, 'Gas Request (%)');
  const powerLimitChartLog = makeChart(pwrLimitCtxLog, 'Power Limit (W)');
  const powerReqChartLog   = makeChart(pwrReqCtxLog, 'Power Request (W)');

  function trimChart(chart, maxPoints = 300) {
    const points = chart.data.datasets[0].data;
    if (points.length > maxPoints) points.splice(0, points.length - maxPoints);
  }
  function trimTable(tbodyEl, maxRows = 300) {
    while (tbodyEl.children.length > maxRows) tbodyEl.removeChild(tbodyEl.firstChild);
  }

  function makeTableRow(data) {
    const tr = document.createElement('tr');
    if (data.bms_state === 'ERROR' || data.vcu_state === 'ERROR') tr.classList.add('error');
    tr.innerHTML = `
      <td>${data.timestamp_ms}</td>
      <td>${data.bms_state || ''}</td>
      <td>${data.battery_soc_pct?.toFixed(1) ?? ''}</td>
      <td>${data.power_limit_w ?? ''}</td>
      <td>${data.vcu_state || ''}</td>
      <td>${data.gas_request_pct?.toFixed(1) ?? ''}</td>
      <td>${data.map_mode || ''}</td>
      <td>${data.power_request_w ?? ''}</td>
    `;
    return tr;
  }

  // ---- Log File dropzone ----
  dropzone.addEventListener('click', async () => {
    const folderPath = await window.api.openFolderDialog();
    if (folderPath) {
      selectedFolderPath = folderPath;
      dropzonePath.textContent = folderPath;
      dropzoneText.textContent = 'SD card content folder selected:';
      convertBtn.disabled = false;
      convertStatus.textContent = '';
    }
  });
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const items = e.dataTransfer.files;
    if (items.length > 0) {
      selectedFolderPath = items[0].path;
      dropzonePath.textContent = selectedFolderPath;
      dropzoneText.textContent = 'SD card content folder selected:';
      convertBtn.disabled = false;
      convertStatus.textContent = '';
    }
  });

  convertBtn.disabled = true;
  convertBtn.addEventListener('click', async () => {
    if (!selectedFolderPath) return;
    convertBtn.disabled = true;
    convertStatus.textContent = 'Converting...';

    tbodyLog.innerHTML = '';
    [socChartLog, gasChartLog, powerLimitChartLog, powerReqChartLog].forEach(c => {
      c.data.datasets[0].data = [];
      c.update('none');
    });

    const result = await window.api.kmfToCsv(selectedFolderPath);
    if (!result.ok) {
      convertStatus.textContent = 'Error: ' + result.error;
      convertBtn.disabled = false;
      return;
    }

    result.rows.forEach(data => {
      tbodyLog.appendChild(makeTableRow(data));
      const t = data.timestamp_ms;
      socChartLog.data.datasets[0].data.push({ x: t, y: data.battery_soc_pct });
      gasChartLog.data.datasets[0].data.push({ x: t, y: data.gas_request_pct });
      powerLimitChartLog.data.datasets[0].data.push({ x: t, y: data.power_limit_w });
      powerReqChartLog.data.datasets[0].data.push({ x: t, y: data.power_request_w });
    });

    [socChartLog, gasChartLog, powerLimitChartLog, powerReqChartLog].forEach(c => c.update('none'));
    convertStatus.textContent = `Done! ${result.rows.length} rows loaded.`;
    convertBtn.disabled = false;
    showTab('table-log', 'log');
  });

  // ---- Live CAN ----
  function cleanedCSVRows() {
    return dataBuffer.map((data) => ({
      timestamp_ms: data.timestamp_ms,
      bms_state: data.bms_state,
      battery_soc_pct: data.battery_soc_pct,
      power_limit_w: data.power_limit_w,
      vcu_state: data.vcu_state,
      gas_request_pct: data.gas_request_pct,
      map_mode: data.map_mode,
      power_request_w: data.power_request_w
    }));
  }

  connectBtn.addEventListener('click', async () => {
    const iface = interfaceInput.value.trim() || 'vcan0';
    const result = await window.api.connectCAN(iface);
    if (!result.connected) {
      statusEl.textContent = result.error || result.message || 'Connection failed.';
    }
  });
  disconnectBtn.addEventListener('click', async () => await window.api.disconnectCAN());
  exportBtn.addEventListener('click', async () => {
    const filePath = await window.api.showSaveDialog();
    if (filePath) {
      await window.api.saveCSV(filePath, cleanedCSVRows());
      alert('CSV saved');
    }
  });

  window.api.onCANStatus((status) => {
    statusEl.textContent = status.error || status.message || 'Unknown status';
  });
  window.api.onCANData((data) => {
    dataBuffer.push(data);
    tbody.appendChild(makeTableRow(data));
    trimTable(tbody);

    const t = data.timestamp_ms;
    socChart.data.datasets[0].data.push({ x: t, y: data.battery_soc_pct });
    trimChart(socChart);
    socChart.update('none');
    gasChart.data.datasets[0].data.push({ x: t, y: data.gas_request_pct });
    trimChart(gasChart);
    gasChart.update('none');
    powerLimitChart.data.datasets[0].data.push({ x: t, y: data.power_limit_w });
    trimChart(powerLimitChart);
    powerLimitChart.update('none');
    powerReqChart.data.datasets[0].data.push({ x: t, y: data.power_request_w });
    trimChart(powerReqChart);
    powerReqChart.update('none');
  });
  window.api.onCANEvents((events) => {
    console.log('CAN events:', events);
  });
});
