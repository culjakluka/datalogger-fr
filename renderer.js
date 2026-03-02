let dataBuffer = [];

document.addEventListener('DOMContentLoaded', () => {

  const tbody = document.querySelector('#dataTable tbody');
  const exportBtn = document.getElementById('exportBtn');

  // CSV export
  exportBtn.addEventListener('click', async () => {
    const path = await window.electronAPI.showSaveDialog();
    if (path) await window.electronAPI.saveCSV(path, dataBuffer);
    alert('CSV saved');
  });

  function showTab(id) {
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
  });

});