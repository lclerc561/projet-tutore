const { exec } = require('child_process');
const { shell } = require('electron');
const fs = require('fs');
const path = require('path');

let processusZola = null;
let arretVolontaire = false;

function getZolaCommand() {
    let cmd = 'zola';
    if (process.platform === 'win32') {
        const userHome = process.env.USERPROFILE || 'C:\\';
        const wingetPath = path.join(userHome, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages', 'getzola.zola_Microsoft.Winget.Source_8wekyb3d8bbwe', 'zola.exe');
        if (fs.existsSync(wingetPath)) cmd = `"${wingetPath}"`;
    }
    return cmd;
}

function lancerServeur(projectDir, callbackErreur) {
    arretVolontaire = false;
    // Tuer tout processus existant avant
    exec('taskkill /IM zola.exe /F', () => {
        setTimeout(() => {
            const cmd = `${getZolaCommand()} serve`;
            processusZola = exec(cmd, { cwd: projectDir }, (error, stdout, stderr) => {
                if (error && !error.killed && !arretVolontaire) {
                    callbackErreur(stderr || error.message);
                }
            });
            // Ouvre le navigateur après 2s
            setTimeout(() => {
                if (processusZola && !arretVolontaire) shell.openExternal('http://127.0.0.1:1111');
            }, 2000);
        }, 500);
    });
}

function arreterServeur() {
    arretVolontaire = true;
    exec('taskkill /IM zola.exe /F');
    processusZola = null;
}

function buildSite(projectDir, outputDir, callbackFin) {
    const cmd = `${getZolaCommand()} build --output-dir "${outputDir}"`;
    exec(cmd, { cwd: projectDir }, (error, stdout, stderr) => {
        callbackFin(error, stderr);
    });
}

module.exports = { lancerServeur, arreterServeur, buildSite };