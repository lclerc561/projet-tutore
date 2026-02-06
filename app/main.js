const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
require('electron-reload')(__dirname, {
    ignored: /node_modules|sites|rendu_genere|[\/\\]\./
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');

    // Correction du focus au lancement
    win.webContents.on('did-finish-load', () => {
        win.show();
        win.focus();            // Focus sur la fenêtre Windows
        win.webContents.focus(); // Focus sur le contenu HTML (Clavier)
    });
}

ipcMain.handle('dialog:openImage', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp', 'jpeg', 'svg'] }
        ]
    });
    
    if (canceled) {
        return null;
    } else {
        return filePaths[0]; // Renvoie le chemin complet de l'image choisie
    }
});

ipcMain.handle('dialog:openVideo', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Vidéos', extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'] }
        ]
    });
    
    if (canceled) {
        return null;
    } else {
        return filePaths[0];
    }
});

app.whenReady().then(createWindow);

//Charger un site
ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory'] //Selection d'un dossier
    });
    
    if (canceled) {
        return null;
    } else {
        return filePaths[0]; //renvoie le chemin du dossier choisi
    }
});