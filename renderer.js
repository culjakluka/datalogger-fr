let dataBuffer = [];

document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.querySelector('#dataTable tbody');
  //Charts
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

  // CSV export
  exportBtn.addEventListener('click', async () => {
    const path = await window.electronAPI.showSaveDialog();
    if (path) await window.electronAPI.saveCSV(path, dataBuffer);
    alert('CSV saved');
  });

  window.showTab = function(id) {
    document.querySelectorAll('.tab').forEach(t => t.style.display = 'none');
    const tab = document.getElementById(id);
    if (tab) tab.style.display = 'block';
  }

  showTab('table');

  //Receiving mock CAN data
  window.electronAPI.onCANData((data) => {
    dataBuffer.push(data);

    const tr = document.createElement('tr');
    if (data.bms_state === 'ERROR' || data.vcu_state === 'ERROR') tr.classList.add('error');

    tr.innerHTML = `
      <td>${data.timestamp_ms}</td>
      <td>${data.bms_state || ''}</td>
      <td>${data.battery_soc_pct?.toFixed(1) || ''}</td>
      <td>${data.power_limit_w || ''}</td>
      <td>${data.vcu_state || ''}</td>
      <td>${data.gas_request_pct?.toFixed(1) || ''}</td>
      <td>${data.map_mode || ''}</td>
      <td>${data.power_request_w || ''}</td>
    `;
    tbody.appendChild(tr);
    
    const t = data.timestamp_ms;

    // SoC
    socChart.data.datasets[0].data.push({ x: t, y: data.battery_soc_pct });
    socChart.update('none');

    // Gas
    gasChart.data.datasets[0].data.push({ x: t, y: data.gas_request_pct });
    gasChart.update('none');

    // 3) Power Limit
    powerLimitChart.data.datasets[0].data.push({ x: t, y: data.power_limit_w });
    powerLimitChart.update('none');

    // 4) Power Request
    powerRequestChart.data.datasets[0].data.push({ x: t, y: data.power_request_w });
    powerRequestChart.update('none');
  });
});