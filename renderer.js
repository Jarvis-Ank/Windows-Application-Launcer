// renderer.js

const appGridElement = document.getElementById('appGrid');
const addAppButton = document.getElementById('addAppButton');
const launchSelectedButton = document.getElementById('launchSelectedButton');
const selectedCountElement = document.getElementById('selectedCount');
const statusMessageElement = document.getElementById('statusMessage');

let applications = []; // Array to store our app objects { name, path, isSelected, iconPath }

// --- Utility Functions ---

function setStatus(message, isError = false) {
    statusMessageElement.textContent = message;
    statusMessageElement.className = isError ? 'status error' : 'status success';
    clearTimeout(statusMessageElement.dataset.timer);
    statusMessageElement.dataset.timer = setTimeout(() => statusMessageElement.textContent = '', 5000);
}

function updateSelectedCount() {
    const count = applications.filter(app => app.isSelected).length;
    selectedCountElement.textContent = count;
    launchSelectedButton.disabled = count === 0; // Disable button if no apps selected
}

// --- Application Data Management ---

async function saveApplications() {
    const result = await window.electronAPI.saveApps(applications);
    if (!result.success) {
        setStatus(`Error saving apps: ${result.error}`, true);
    }
}

async function loadApplications() {
    const loadedApps = await window.electronAPI.loadApps();
    applications = loadedApps.map(app => ({
        ...app,
        isSelected: app.isSelected !== undefined ? app.isSelected : true // Default to selected
    }));
    renderAppGrid();
    updateSelectedCount();
}

// --- UI Rendering ---

function renderAppGrid() {
    // Clear all existing app tiles, but keep the 'Add App' button
    const existingAppTiles = appGridElement.querySelectorAll('.app-tile');
    existingAppTiles.forEach(tile => tile.remove());

    applications.forEach((app, index) => {
        const appTile = document.createElement('div');
        appTile.className = `app-tile ${app.isSelected ? 'selected' : ''}`;
        appTile.title = app.path; // Show full path on hover

        const appIcon = document.createElement('img');
        appIcon.className = 'app-icon';
        // Check if iconPath exists and is valid, otherwise use a fallback
        appIcon.src = app.iconPath || '../assets/default-app-icon.png'; // Fallback icon (you'd create this)
        appIcon.alt = `${app.name} icon`;

        const appName = document.createElement('span');
        appName.className = 'app-name';
        appName.textContent = app.name;

        const removeOverlay = document.createElement('div');
        removeOverlay.className = 'remove-app-overlay';
        removeOverlay.textContent = 'X';
        removeOverlay.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent tile selection when clicking 'X'
            applications.splice(index, 1); // Remove app from array
            saveApplications();
            renderAppGrid(); // Re-render the grid
            updateSelectedCount();
            setStatus(`Removed ${app.name}`);
        });

        appTile.appendChild(appIcon);
        appTile.appendChild(appName);
        appTile.appendChild(removeOverlay);

        appTile.addEventListener('click', () => {
            app.isSelected = !app.isSelected; // Toggle selection
            appTile.classList.toggle('selected', app.isSelected);
            saveApplications(); // Save state immediately
            updateSelectedCount();
        });

        // Insert app tile before the 'Add App' button
        appGridElement.insertBefore(appTile, addAppButton);
    });
}

// --- Event Listeners ---

addAppButton.addEventListener('click', async () => {
    // Show status to indicate operation in progress
    setStatus('Opening file dialog...');
    const selectedApp = await window.electronAPI.selectAppPath();
    if (selectedApp) {
        // Fetch icon path from the main process
        const iconData = await window.electronAPI.getAppIcon(selectedApp.path);
        selectedApp.iconPath = iconData; // iconData will be a Data URL or null

        // Check if app is already in the list to avoid duplicates
        const exists = applications.some(app => app.path === selectedApp.path);
        if (!exists) {
            applications.push({
                name: selectedApp.name,
                path: selectedApp.path,
                iconPath: selectedApp.iconPath,
                isSelected: true // New apps are selected by default
            });
            await saveApplications();
            renderAppGrid();
            updateSelectedCount();
            setStatus(`Added ${selectedApp.name}`);
        } else {
            setStatus(`${selectedApp.name} is already in the list.`, true);
        }
    } else {
        setStatus('Application selection cancelled.');
    }
});

launchSelectedButton.addEventListener('click', async () => {
    const selectedApps = applications.filter(app => app.isSelected);
    if (selectedApps.length === 0) {
        setStatus('No applications selected to launch.', true);
        return;
    }

    setStatus(`Launching ${selectedApps.length} applications...`);
    for (const app of selectedApps) {
        const result = await window.electronAPI.launchApp(app.path);
        if (!result.success) {
            setStatus(`Failed to launch ${app.name}: ${result.error}`, true);
        }
    }
    setStatus('All selected applications launched (or attempted).');
});

// Initial load when the renderer process starts
document.addEventListener('DOMContentLoaded', loadApplications);