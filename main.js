// main.js

const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } = require('electron'); // Add nativeImage
const path = require('path');
const fs = require('fs');

let mainWindow;
const configPath = path.join(app.getPath('userData'), 'apps.json');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 650, // Slightly taller for the new layout
        minWidth: 650,
        minHeight: 500,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        icon: path.join(__dirname, 'icon.png') // Optional: path to your app icon
    });

    mainWindow.loadFile('index.html');

    // Optional: Open the DevTools.
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- IPC Handlers (Backend Logic) ---

ipcMain.handle('select-app-path', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Executables/Shortcuts', extensions: ['exe', 'lnk'] }] // Filter for executables and shortcuts
    });

    if (canceled) {
        return null;
    } else {
        const filePath = filePaths[0];
        // For .lnk files, try to resolve the target path to get a better name/icon
        let appName = path.basename(filePath).replace(/\.(exe|lnk)$/i, '');

        // This is a simple way to attempt getting the actual target of a shortcut
        // A more robust solution might involve parsing .lnk files, which is complex.
        // For now, we'll just use the .lnk name.

        return { name: appName, path: filePath };
    }
});

// NEW IPC Handler for getting app icon
ipcMain.handle('get-app-icon', async (event, appPath) => {
    try {
        // electron.app.getFileIcon returns a nativeImage object
        const icon = await app.getFileIcon(appPath, { size: 'normal' }); // 'normal' is usually 32x32 or 48x48

        // Convert nativeImage to a Data URL (base64 string) for display in HTML
        return icon.toDataURL();
    } catch (error) {
        console.error(`Failed to get icon for ${appPath}:`, error);
        // Return a default/null if icon extraction fails
        return null;
    }
});


ipcMain.handle('save-apps', async (event, apps) => {
    try {
        fs.writeFileSync(configPath, JSON.stringify(apps, null, 2));
        return { success: true };
    } catch (error) {
        console.error('Failed to save apps:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-apps', async () => {
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Failed to load apps:', error);
        return [];
    }
});

ipcMain.handle('launch-app', async (event, appPath) => {
    try {
        const { err } = await shell.openPath(appPath);
        if (err) {
            console.error(`Failed to launch ${appPath}:`, err);
            return { success: false, error: err };
        }
        return { success: true };
    } catch (error) {
        console.error(`Failed to launch ${appPath}:`, error);
        return { success: false, error: error.message };
    }
});