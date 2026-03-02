const EventEmitter = require('events');
const emitter = new EventEmitter();

let soc = 80.0; //starts at 80%

//sends mock CAN messages
function startMockCAN() {
  //BMS at 10Hz
  setInterval(() => {
    soc -= 0.01;
    if (soc < 0) soc = 100;

    const buffer = Buffer.alloc(8);
    
    buffer[0] = 1; //state READY
    buffer.writeUInt16LE(Math.round(soc * 10), 1); //LSB at byte 1 and MSB at byte 2
    buffer.writeUInt16LE(50000, 3);

    emitter.emit('message', { id: 0x100, data: buffer });
  }, 100);

  //VCU at 20Hz
  setInterval(() => {
    const gas = Math.random() * 100;

    const buffer = Buffer.alloc(8);

    buffer[0] = 1; //state READY
    buffer.writeUInt16LE(Math.round(gas * 10), 1);
    buffer[3] = 1; //state NORMAL
    buffer.writeUInt16LE(Math.round(gas * 500), 4);

    emitter.emit('message', { id: 0x200, data: buffer });
  }, 50);
}

module.exports = { startMockCAN, emitter };