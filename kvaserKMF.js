/*
    kvaserKMF.js
    Provides function for converting 
    bin kmf files from KVASER MEMORATOR
    to needed files (csv, ....)
*/
const { execFile } = require('child_process');
const path = require('path');

// venv provides need files for running program throught file
// like this
const PYTHON = path.join(__dirname, 'python', '.venv', 'bin', 'python3');

function kmfToCsv(pathToSd, outputPath) {
    return new Promise((resolve, reject) => {
        const script = path.join(__dirname, 'python', 'kmfToCsv.py');
        execFile(PYTHON, [script, pathToSd, outputPath], (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
                return;
            }
            resolve(stdout.trim());
        });
    });
}

// kmfToCsv('/mnt', 'output.csv')

module.exports = { kmfToCsv };