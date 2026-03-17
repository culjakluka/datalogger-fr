let latestBms = {
  bms_state: 'IDLE',
  battery_soc_pct: 0,
  power_limit_w: 0
};

let latestVcu = {
  vcu_state: 'IDLE',
  gas_request_pct: 0,
  map_mode: 'ECO',
  power_request_w: 0
};

let previousBmsState = null;
let previousVcuState = null;

function buildRow(timestamp) {
  const row = {
    timestamp_ms: timestamp,
    bms_state: latestBms.bms_state,
    battery_soc_pct: latestBms.battery_soc_pct,
    power_limit_w: latestBms.power_limit_w,
    vcu_state: latestVcu.vcu_state,
    gas_request_pct: latestVcu.gas_request_pct,
    map_mode: latestVcu.map_mode,
    power_request_w: latestVcu.power_request_w
  };

  row.error_active = row.bms_state === 'ERROR' || row.vcu_state === 'ERROR';

  return row;
}

function updateState(decoded) {
  const events = [];

  if (decoded.source === 'BMS') {
    latestBms = {
      bms_state: decoded.bms_state,
      battery_soc_pct: decoded.battery_soc_pct,
      power_limit_w: decoded.power_limit_w
    };

    if (previousBmsState !== null && previousBmsState !== decoded.bms_state) {
      events.push({
        type: 'state-change',
        source: 'BMS',
        from: previousBmsState,
        to: decoded.bms_state,
        timestamp_ms: decoded.timestamp_ms
      });
    }

    if (decoded.bms_state === 'ERROR' && previousBmsState !== 'ERROR') {
      events.push({
        type: 'error-entry',
        source: 'BMS',
        state: decoded.bms_state,
        timestamp_ms: decoded.timestamp_ms
      });
    }

    previousBmsState = decoded.bms_state;
  }

  if (decoded.source === 'VCU') {
    latestVcu = {
      vcu_state: decoded.vcu_state,
      gas_request_pct: decoded.gas_request_pct,
      map_mode: decoded.map_mode,
      power_request_w: decoded.power_request_w
    };

    if (previousVcuState !== null && previousVcuState !== decoded.vcu_state) {
      events.push({
        type: 'state-change',
        source: 'VCU',
        from: previousVcuState,
        to: decoded.vcu_state,
        timestamp_ms: decoded.timestamp_ms
      });
    }

    if (decoded.vcu_state === 'ERROR' && previousVcuState !== 'ERROR') {
      events.push({
        type: 'error-entry',
        source: 'VCU',
        state: decoded.vcu_state,
        timestamp_ms: decoded.timestamp_ms
      });
    }

    previousVcuState = decoded.vcu_state;
  }

  const row = buildRow(decoded.timestamp_ms);
  return { row, events };
}

function resetState() {
  latestBms = {
    bms_state: 'IDLE',
    battery_soc_pct: 0,
    power_limit_w: 0
  };

  latestVcu = {
    vcu_state: 'IDLE',
    gas_request_pct: 0,
    map_mode: 'ECO',
    power_request_w: 0
  };

  previousBmsState = null;
  previousVcuState = null;
}

module.exports = { updateState, resetState };
function resetMergedState() {
  currentState = {
    timestamp_ms: 0,
    bms_state: '',
    battery_soc_pct: 0,
    power_limit_w: 0,
    vcu_state: '',
    gas_request_pct: 0,
    map_mode: '',
    power_request_w: 0
  };
}

module.exports = { updateState, resetMergedState };
