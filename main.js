// main.js

const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const configPath = path.join(app.getPath('userData'), 'apps.json');
const groupsPath = path.join(app.getPath('userData'), 'groups.json'); // New path for groups

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1024, // Wider window for new layout
        height: 768, // Taller window
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        icon: path.join(__dirname, 'icon.png'), // Optional: path to your app icon
        frame: false, // No default frame for custom title bar
        titleBarStyle: 'hidden', // Hide title bar on macOS
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

// Helper to resolve .lnk files (Windows only)
async function resolveShortcutPath(shortcutPath) {
    if (process.platform === 'win32' && shortcutPath.endsWith('.lnk')) {
        try {
            // Electron's shell.readShortcutLink can resolve .lnk files
            const shortcut = shell.readShortcutLink(shortcutPath);
            if (shortcut && shortcut.target) {
                return shortcut.target;
            }
        } catch (error) {
            console.warn(`Could not resolve shortcut ${shortcutPath}:`, error);
        }
    }
    return shortcutPath; // Return original path if not a shortcut or failed to resolve
}

// IPC Handlers
ipcMain.handle('select-app-path', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Executables/Shortcuts', extensions: ['exe', 'lnk'] }]
    });

    if (canceled) {
        return null;
    } else {
        const filePath = filePaths[0];
        const resolvedPath = await resolveShortcutPath(filePath);
        const appName = path.basename(resolvedPath).replace(/\.(exe|lnk)$/i, '');
        return { name: appName, path: resolvedPath };
    }
});

ipcMain.handle('get-app-icon', async (event, appPath) => {
    try {
        const icon = await app.getFileIcon(appPath, { size: 'large' }); // Request larger icon
        return icon.toDataURL();
    } catch (error) {
        console.error(`Failed to get icon for ${appPath}:`, error);
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

ipcMain.handle('save-groups', async (event, groups) => {
    try {
        fs.writeFileSync(groupsPath, JSON.stringify(groups, null, 2));
        return { success: true };
    } catch (error) {
        console.error('Failed to save groups:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-groups', async () => {
    try {
        if (fs.existsSync(groupsPath)) {
            const data = fs.readFileSync(groupsPath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Failed to load groups:', error);
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

// NEW: Discover common apps function
ipcMain.handle('discover-common-apps', async () => {
    const commonApps = [];
    const knownPaths = [
        { name: 'Google Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
        { name: 'Microsoft Word', path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE' },
        { name: 'Spotify', path: 'C:\\Users\\%USERNAME%\\AppData\\Roaming\\Spotify\\Spotify.exe' }, // User-specific
        { name: 'Slack', path: 'C:\\Users\\%USERNAME%\\AppData\\Local\\slack\\app-*.\\slack.exe' }, // Wildcard for version
        { name: 'Visual Studio Code', path: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe' },
        { name: 'Zoom', path: 'C:\\Users\\%USERNAME%\\AppData\\Roaming\\Zoom\\bin\\Zoom.exe' },
        { name: 'File Explorer', path: 'C:\\Windows\\explorer.exe' },
        { name: 'Adobe Photoshop', path: 'C:\\Program Files\\Adobe\\Adobe Photoshop *\\Photoshop.exe' }, // Wildcard for version
        { name: 'Microsoft Edge', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' },
        { name: 'Notepad', path: 'C:\\Windows\\System32\\notepad.exe' },
        { name: 'Calculator', path: 'C:\\Windows\\System32\\calc.exe' }
        // Add more common apps here
    ];

    for (const appInfo of knownPaths) {
        let appPath = appInfo.path.replace('%USERNAME%', process.env.USERNAME);

        // Handle wildcards for version numbers (e.g., Slack, Photoshop)
        if (appPath.includes('*')) {
            const dir = path.dirname(appPath);
            const fileName = path.basename(appPath);
            try {
                const files = await fs.promises.readdir(dir);
                const matchingFile = files.find(f => {
                    // Simple wildcard match (e.g., app-*.exe)
                    const pattern = new RegExp('^' + fileName.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$', 'i');
                    return pattern.test(f);
                });
                if (matchingFile) {
                    appPath = path.join(dir, matchingFile);
                } else {
                    appPath = null; // No matching file found
                }
            } catch (e) {
                appPath = null; // Directory might not exist or permission issue
            }
        }

        if (appPath && fs.existsSync(appPath)) {
            const icon = await app.getFileIcon(appPath, { size: 'large' });
            commonApps.push({
                name: appInfo.name,
                path: appPath,
                iconPath: icon ? icon.toDataURL() : null,
                isDiscovered: true // Mark as discovered, not user-added
            });
        }
    }
    return commonApps;
});