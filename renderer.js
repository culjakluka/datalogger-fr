let dataBuffer = [];
let eventBuffer = [];

document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.querySelector('#dataTable tbody');
  const eventsTbody = document.querySelector('#eventsTable tbody');

  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');

  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const interfaceInput = document.getElementById('canInterface');
  const statusEl = document.getElementById('connectionStatus');

  let lastEventState = {
    bms_state: null,
    vcu_state: null
  };

  // Charts
  const socCtx = document.getElementById('socChart');
  const gasCtx = document.getElementById('gasChart');
  const pwrLimitCtx = document.getElementById('powerLimitChart');
  const pwrReqCtx = document.getElementById('powerRequestChart');

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

  const socChart = new Chart(socCtx, {
    type: 'line',
    data: {
      datasets: [{ label: 'Battery SoC (%)', data: [], borderWidth: 2, tension: 0.1 }]
    },
    options: commonOptions
  });

  const gasChart = new Chart(gasCtx, {
    type: 'line',
    data: {
      datasets: [{ label: 'Gas Request (%)', data: [], borderWidth: 2, tension: 0.1 }]
    },
    options: commonOptions
  });

  const powerLimitChart = new Chart(pwrLimitCtx, {
    type: 'line',
    data: {
      datasets: [{ label: 'Power Limit (W)', data: [], borderWidth: 2, tension: 0.1 }]
    },
    options: commonOptions
  });

  const powerRequestChart = new Chart(pwrReqCtx, {
    type: 'line',
    data: {
      datasets: [{ label: 'Power Request (W)', data: [], borderWidth: 2, tension: 0.1 }]
    },
    options: commonOptions
  });

  function trimChart(chart, maxPoints = 300) {
    const points = chart.data.datasets[0].data;
    if (points.length > maxPoints) {
      points.splice(0, points.length - maxPoints);
    }
  }

  function trimTable(maxRows = 300) {
    while (tbody.children.length > maxRows) {
      tbody.removeChild(tbody.firstChild);
    }
  }

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

  function clearAllUI() {
    dataBuffer = [];
    eventBuffer = [];
    tbody.innerHTML = '';
    eventsTbody.innerHTML = '';

    socChart.data.datasets[0].data = [];
    gasChart.data.datasets[0].data = [];
    powerLimitChart.data.datasets[0].data = [];
    powerRequestChart.data.datasets[0].data = [];

    socChart.update('none');
    gasChart.update('none');
    powerLimitChart.update('none');
    powerRequestChart.update('none');

    lastEventState = {
      bms_state: null,
      vcu_state: null
    };
  }

  function addEventRow(eventItem) {
    eventBuffer.push(eventItem);

    const tr = document.createElement('tr');
    if (eventItem.type === 'ERROR') tr.classList.add('error');

    tr.innerHTML = `
      <td>${eventItem.timestamp_ms}</td>
      <td>${eventItem.source}</td>
      <td>${eventItem.type}</td>
      <td>${eventItem.value}</td>
    `;

    eventsTbody.appendChild(tr);
  }

  function detectEvents(data) {
    const prevBms = lastEventState.bms_state;
    const prevVcu = lastEventState.vcu_state;

    if (data.bms_state !== prevBms) {
      addEventRow({
        timestamp_ms: data.timestamp_ms,
        source: 'BMS',
        type: 'STATE_CHANGE',
        value: data.bms_state || ''
      });

      if (data.bms_state === 'ERROR' && prevBms !== 'ERROR') {
        addEventRow({
          timestamp_ms: data.timestamp_ms,
          source: 'BMS',
          type: 'ERROR',
          value: 'BMS entered ERROR'
        });
      }

      lastEventState.bms_state = data.bms_state;
    }

    if (data.vcu_state !== prevVcu) {
      addEventRow({
        timestamp_ms: data.timestamp_ms,
        source: 'VCU',
        type: 'STATE_CHANGE',
        value: data.vcu_state || ''
      });

      if (data.vcu_state === 'ERROR' && prevVcu !== 'ERROR') {
        addEventRow({
          timestamp_ms: data.timestamp_ms,
          source: 'VCU',
          type: 'ERROR',
          value: 'VCU entered ERROR'
        });
      }

      lastEventState.vcu_state = data.vcu_state;
    }
  }

  function renderSample(data) {
    dataBuffer.push(data);

    const tr = document.createElement('tr');
    if (data.bms_state === 'ERROR' || data.vcu_state === 'ERROR') {
      tr.classList.add('error');
    }

    tr.innerHTML = `
      <td>${data.timestamp_ms}</td>
      <td>${data.bms_state || ''}</td>
      <td>${data.battery_soc_pct?.toFixed(1) || ''}</td>
      <td>${data.power_limit_w ?? ''}</td>
      <td>${data.vcu_state || ''}</td>
      <td>${data.gas_request_pct?.toFixed(1) || ''}</td>
      <td>${data.map_mode || ''}</td>
      <td>${data.power_request_w ?? ''}</td>
    `;

    tbody.appendChild(tr);
    trimTable();

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

    powerRequestChart.data.datasets[0].data.push({ x: t, y: data.power_request_w });
    trimChart(powerRequestChart);
    powerRequestChart.update('none');

    detectEvents(data);
  }

  // Connect / disconnect
  if (connectBtn && disconnectBtn && interfaceInput && statusEl && window.api?.connectCAN) {
    connectBtn.addEventListener('click', async () => {
      const iface = interfaceInput.value.trim() || 'vcan0';
      const result = await window.api.connectCAN(iface);

      if (!result.connected) {
        statusEl.textContent = result.error || result.message || 'Connection failed.';
      }
    });

    disconnectBtn.addEventListener('click', async () => {
      await window.api.disconnectCAN();
    });
  }

  // Export CSV
  exportBtn.addEventListener('click', async () => {
    const filePath = await window.api.showSaveDialog();
    if (filePath) {
      await window.api.saveCSV(filePath, cleanedCSVRows());
      alert('CSV saved');
    }
  });

  // Import Memorator log
  if (importBtn) {
    importBtn.addEventListener('click', async () => {
      const filePath = await window.api.openLogFile();
      if (!filePath) return;

      clearAllUI();

      const importedRows = await window.api.importMemoratorLog(filePath);
      importedRows.forEach((row) => renderSample(row));

      alert('Memorator log imported');
    });
  }

  // Tabs
  window.showTab = function (id) {
    document.querySelectorAll('.tab').forEach((t) => {
      t.style.display = 'none';
    });

    const tab = document.getElementById(id);
    if (tab) tab.style.display = 'block';

    document.querySelectorAll('#tabs button[data-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === id);
    });
  };

  document.querySelectorAll('#tabs button[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  showTab('table');

  // Live CAN status
  if (window.api?.onCANStatus && statusEl) {
    window.api.onCANStatus((status) => {
      statusEl.textContent = status.error || status.message || 'Unknown status';
    });
  }

  // Live CAN data
  if (window.api?.onCANData) {
    window.api.onCANData((data) => {
      renderSample(data);
    });
  }

  // Offline / imported CAN data
  if (window.api?.onCANData) {
    window.api.onCANData((data) => {
      renderSample(data);
    });
  }

  if (window.api?.onCANEvents) {
    window.api.onCANEvents((events) => {
      console.log('CAN events:', events);
    });
  }
});