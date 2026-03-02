let lastBMS = { bms_state: 'IDLE', battery_soc_pct: 0, power_limit_w: 0};
let lastVCU = { vcu_state: 'IDLE', gas_request_pct: 0, map_mode: 'ECO', power_request_w: 0};
let startTime = Date.now();

function decodeMessage(msg) {
  const ts = Date.now() - startTime;
  const data = msg.data;

  if(msg.id === 0x100) {
    lastBMS = {
      bms_state: ['IDLE', 'READY', 'ERROR'][data[0]] || 'UNKNOWN',
      battery_soc_pct: data.readUInt16LE(1) * 0.1,
      power_limit_w: data.readUInt16LE(3)
    };
  }

  if(msg.id === 0x200) {
    lastVCU = {
      vcu_state: ['IDLE', 'READY', 'ERROR'][data[0]] || 'UNKNOWN',
      gas_request_pct: data.readUInt16LE(1) * 0.1,
      map_mode: ['ECO', 'NORMAL', 'SPORT'][data[3]] || 'UNKNOWN',
      power_request_w: data.readUInt16LE(4)
    };
  }

  return {
    timestamp_ms: ts,
    ...lastBMS,
    ...lastVCU
  };
}

module.exports = { decodeMessage };