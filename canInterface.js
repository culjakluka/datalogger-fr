const can = require('socketcan');

let activeChannel = null;
let activeInterface = null;

function normalizeData(data) {
  if(Buffer.isBuffer(data)) return data;
  if(Array.isArray(data)) return Buffer.from(data);
  if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
    return Buffer.from(data.data);
  }
  return Buffer.alloc(0);
}

function disconnect() {
  if (!activeChannel) {
    activeInterface = null;
    return;
  }

  try {
    activeChannel.stop();
  } catch (_) {}

  activeChannel = null;
  activeInterface = null;
}

function connect(iface, onMessage) {
  disconnect();

  const channel = can.createRawChannel(iface, true);

  channel.addListener('onMessage', (msg) => {
    onMessage({
      id: msg.id,
      data: normalizeData(msg.data)
    });
  });

  channel.start();

  activeChannel = channel;
  activeInterface = iface;
}

function getActiveInterface() {
  return activeInterface;
}

module.exports = { connect, disconnect, getActiveInterface };