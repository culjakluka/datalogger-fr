const fs = require('fs');
const path = require('path');

function getCanInterfaces() {
    const netDir = '/sys/class/net';
    const interfaces = [];

    try {
        const entries = fs.readdirSync(netDir);
        for (const iface of entries) {
            const typePath = path.join(netDir, iface, 'type');
            try {
                const type = fs.readFileSync(typePath, 'utf8').trim();
                // CAN interfaces have type 280
                if (type === '280') {
                    interfaces.push(iface);
                }
            } catch {
                console.log("No can interfaces found");
            }
        }
    } catch (err) {
        console.error('Failed to read network interfaces:', err.message);
    }

    return interfaces;
}

module.exports = { getCanInterfaces };