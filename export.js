const fs = require('fs');
const { stringify } = require('csv-stringify/sync');

function exportCSV(data, filePath) {
    const csv = stringify(data, { header: true });
    fs.writeFileSync(filePath, csv);
}

module.exports = { exportCSV };