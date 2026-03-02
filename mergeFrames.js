let currentState = {
  timestamp_ms: 0,
  bms_state: '',
  battery_soc_pct: 0,
  power_limit_w: 0,
  vcu_state: '',
  gas_request_pct: 0,
  map_mode: '',
  power_request_w: 0
};

function updateState(decoded) {
  currentState = { ...currentState, ...decoded };
  return { ...currentState };
}

module.exports = { updateState };