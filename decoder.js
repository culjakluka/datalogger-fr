const BMS_STATES = ['IDLE', 'READY', 'ERROR'];
const VCU_STATES = ['IDLE', 'READY', 'ERROR'];
const MAP_MODES = ['ECO', 'NORMAL', 'SPORT'];

function decodeMessage(msg) {
  
  if(!msg || !Buffer.isBuffer(msg.data)) {
    return null;
  }
  const ts = typeof msg.timestamp_ms === 'number'
    ? msg.timestamp_ms
    : Date.now() - startTime;

  const data = msg.data;

  if(msg.id === 0x100) {
    if (msg.data.length < 5) return null;

    const stateRaw = msg.data.readUInt8(0);
    const socRaw = msg.data.readUInt16LE(1);
    const powerLimitRaw = msg.data.readUInt16LE(3);

    return {
      source: 'BMS',
      timestamp_ms: Date.now(),
      bms_state: BMS_STATES[stateRaw] || `UNKNOWN_${stateRaw}`,
      battery_soc_pct: socRaw * 0.1,
      power_limit_w: powerLimitRaw
    };
  }

  if(msg.id === 0x200) {
    if (msg.data.length < 6) return null;

    const stateRaw = msg.data.readUInt8(0);
    const gasRaw = msg.data.readUInt16LE(1);
    const mapRaw = msg.data.readUInt8(3);
    const powerRequestRaw = msg.data.readUInt16LE(4);

    return {
      source: 'VCU',
      timestamp_ms: Date.now(),
      vcu_state: VCU_STATES[stateRaw] || `UNKNOWN_${stateRaw}`,
      gas_request_pct: gasRaw * 0.1,
      map_mode: MAP_MODES[mapRaw] || `UNKNOWN_${mapRaw}`,
      power_request_w: powerRequestRaw
    };
  }

  return null;
}

function resetDecoderState() {
  lastBMS = { bms_state: 'IDLE', battery_soc_pct: 0, power_limit_w: 0 };
  lastVCU = { vcu_state: 'IDLE', gas_request_pct: 0, map_mode: 'ECO', power_request_w: 0 };
  startTime = Date.now();
}

module.exports = { decodeMessage, resetDecoderState };