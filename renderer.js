let dataBuffer = [];
document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.querySelector('#dataTable tbody');
  //Charts
  const socCtx = document.getElementById('socChart');
  const gasCtx = document.getElementById('gasChart');
  const pwrLimitCtx = document.getElementById('powerLimitChart');
  const pwrReqCtx = document.getElementById('powerRequestChart');
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const exportBtn = document.getElementById('exportBtn');
  const interfaceInput = document.getElementById('canInterface');
  const interfaceList = document.getElementById('canInterfaceList');
  const statusEl = document.getElementById('connectionStatus');

  // Populate datalist with available CAN interfaces
  const ifaces = await window.api.getCanInterfaces();
  ifaces.forEach((iface) => {
    const option = document.createElement('option');
    option.value = iface;
    interfaceList.appendChild(option);
  });
  // Auto-select first interface if available
  if (ifaces.length > 0) {
    interfaceInput.value = ifaces[0];
  }

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
    data: { datasets: [{ label: 'Battery SoC (%)', data: [], borderWidth: 2, tension: 0.1 }] },
    options: commonOptions
  });
  const gasChart = new Chart(gasCtx, {
    type: 'line',
    data: { datasets: [{ label: 'Gas Request (%)', data: [], borderWidth: 2, tension: 0.1 }] },
    options: commonOptions
  });
  const powerLimitChart = new Chart(pwrLimitCtx, {
    type: 'line',
    data: { datasets: [{ label: 'Power Limit (W)', data: [], borderWidth: 2, tension: 0.1 }] },
    options: commonOptions
  });
  const powerRequestChart = new Chart(pwrReqCtx, {
    type: 'line',
    data: { datasets: [{ label: 'Power Request (W)', data: [], borderWidth: 2, tension: 0.1 }] },
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
  connectBtn.addEventListener('click', async () => {
    const iface = interfaceInput.value.trim() || 'vcan0';
    const result = await window.api.connectCAN(iface);
    if(!result.connected) {
      statusEl.textContent = result.error || result.message || 'Connection failed.';
    }
  });
  disconnectBtn.addEventListener('click', async () => {
    await window.api.disconnectCAN();
  });
  // CSV export
  exportBtn.addEventListener('click', async () => {
    const filePath = await window.api.showSaveDialog();
    if (filePath) {
      await window.api.saveCSV(filePath, cleanedCSVRows());
      alert('CSV saved');
    }
  });
  window.showTab = function(id) {
    document.querySelectorAll('.tab').forEach(t => t.style.display = 'none');
    const tab = document.getElementById(id);
    if (tab) tab.style.display = 'block';
    document.querySelectorAll('#tabs button[data-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab ===id);
    });
  };
  document.querySelectorAll('#tabs button[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });
  showTab('table');
  window.api.onCANStatus((status) => {
    statusEl.textContent = status.error || status.message || 'Unknown status';
  });
  window.api.onCANData((data) => {
    dataBuffer.push(data);
    const tr = document.createElement('tr');
    if (data.bms_state === 'ERROR' || data.vcu_state === 'ERROR') tr.classList.add('error');
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
  });
  window.api.onCANEvents((events) => {
    console.log('CAN events:', events);
  });
});