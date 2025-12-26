// renderer.js

const appGridElement = document.getElementById('appGrid');
const addAppButton = document.getElementById('addAppButton');
const launchSelectedButton = document.getElementById('launchSelectedButton');
const selectedCountElement = document.getElementById('selectedCount');
const availableAppsSummaryElement = document.getElementById('availableAppsSummary');

const selectAllButton = document.getElementById('selectAllButton');
const clearSelectionButton = document.getElementById('clearSelectionButton');
const saveGroupButton = document.getElementById('saveGroupButton');
const groupsContainer = document.getElementById('groupsContainer');

let applications = []; // Array to store our app objects { name, path, isSelected, iconPath }
let appGroups = []; // Array to store app groups

// --- Modal Elements ---
const saveGroupModal = document.getElementById('saveGroupModal');
const launchConfirmModal = document.getElementById('launchConfirmModal');
const closeButtons = document.querySelectorAll('.close-modal-btn');

const modalSelectedCount = document.getElementById('modalSelectedCount');
const groupNameInput = document.getElementById('groupNameInput');
const colorOptions = document.querySelectorAll('.color-picker .color-option');
const groupPreview = document.getElementById('groupPreview');
const previewGroupName = document.getElementById('previewGroupName');
const previewAppCount = document.getElementById('previewAppCount');
const createGroupButton = document.getElementById('createGroupButton');

const launchModalSelectedCount = document.getElementById('launchModalSelectedCount');
const launchAppList = document.getElementById('launchAppList');
const confirmLaunchButton = document.getElementById('confirmLaunchButton');

let selectedAccentColor = '#61dafb'; // Default accent color for new groups

// --- Utility Functions ---

function updateCounts() {
    const selectedAppsCount = applications.filter(app => app.isSelected).length;
    selectedCountElement.textContent = selectedAppsCount;
    availableAppsSummaryElement.textContent = `${selectedAppsCount} / ${applications.length} selected`;
    launchSelectedButton.disabled = selectedAppsCount === 0;
    saveGroupButton.disabled = selectedAppsCount === 0;
}

function showModal(modalElement) {
    modalElement.classList.add('visible');
}

function hideModal(modalElement) {
    modalElement.classList.remove('visible');
}

// --- Application Data Management (Apps) ---

async function saveApplications() {
    const result = await window.electronAPI.saveApps(applications);
    if (!result.success) {
    }
}

async function loadApplications() {
    const userApps = await window.electronAPI.loadApps();
    const commonApps = await window.electronAPI.discoverCommonApps();

    // Merge discovered apps and user-added apps, prioritizing user-added if paths overlap
    const mergedApps = [...commonApps];
    userApps.forEach(userApp => {
        if (!mergedApps.some(app => app.path === userApp.path)) {
            mergedApps.push(userApp);
        } else {
            // Update existing common app with user selection state if it exists
            const existingApp = mergedApps.find(app => app.path === userApp.path);
            if (existingApp) {
                existingApp.isSelected = userApp.isSelected;
            }
        }
    });

    applications = mergedApps.map(app => ({
        ...app,
        isSelected: app.isSelected !== undefined ? app.isSelected : false // Default to not selected
    }));
    renderAppGrid();
    updateCounts();
}

// --- Group Data Management ---

async function saveGroups() {
    const result = await window.electronAPI.saveGroups(appGroups);
    if (!result.success) {
    }
}

async function loadGroups() {
    appGroups = await window.electronAPI.loadGroups();
    renderGroups();
}

function renderGroups() {
    groupsContainer.innerHTML = ''; // Clear existing groups
    if (appGroups.length === 0) {
        groupsContainer.classList.remove('has-groups');
        groupsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No groups yet. Select apps and save them as a group.</p>
            </div>
        `;
    } else {
        groupsContainer.classList.add('has-groups');
        appGroups.forEach((group, index) => {
            const groupTile = document.createElement('div');
            groupTile.className = 'group-tile';
            groupTile.title = group.name;

            const groupIcon = document.createElement('div');
            groupIcon.className = 'group-tile-icon';
            groupIcon.style.backgroundColor = group.accentColor;
            groupIcon.textContent = '★'; // Or first letter of group name

            const groupInfo = document.createElement('div');
            groupInfo.className = 'group-tile-info';

            const groupName = document.createElement('span');
            groupName.className = 'group-name';
            groupName.textContent = group.name;

            const groupAppCount = document.createElement('span');
            groupAppCount.className = 'group-app-count';
            groupAppCount.textContent = `${group.appPaths.length} apps`;

            groupInfo.appendChild(groupName);
            groupInfo.appendChild(groupAppCount);
            groupTile.appendChild(groupIcon);
            groupTile.appendChild(groupInfo);

            groupTile.addEventListener('click', () => {
                // Deselect all current apps
                applications.forEach(app => app.isSelected = false);
                // Select apps in this group
                group.appPaths.forEach(pathInGroup => {
                    const app = applications.find(a => a.path === pathInGroup);
                    if (app) app.isSelected = true;
                });
                renderAppGrid(); // Re-render to show selections
                updateCounts();
            });

            // Add context menu for groups (e.g., Delete Group)
            groupTile.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
                    appGroups.splice(index, 1);
                    saveGroups();
                    renderGroups();
                }
            });

            groupsContainer.appendChild(groupTile);
        });
    }
}


// --- UI Rendering (App Grid) ---

function renderAppGrid() {
    appGridElement.innerHTML = ''; // Clear existing app tiles

    applications.forEach((app, index) => {
        const appTile = document.createElement('div');
        appTile.className = `app-tile ${app.isSelected ? 'selected' : ''}`;
        appTile.title = app.path;

        const appIcon = document.createElement('img');
        appIcon.className = 'app-icon';
        appIcon.src = app.iconPath || './assets/default-app-icon.png'; // Fallback icon
        appIcon.alt = `${app.name} icon`;

        const appName = document.createElement('span');
        appName.className = 'app-name';
        appName.textContent = app.name;

        const selectionOverlay = document.createElement('div');
        selectionOverlay.className = 'selection-overlay';
        selectionOverlay.innerHTML = '<i class="fas fa-check"></i>';

        appTile.appendChild(appIcon);
        appTile.appendChild(appName);
        appTile.appendChild(selectionOverlay);

        appTile.addEventListener('click', (e) => {
            // Check if click was on remove overlay (if we re-add it directly to tile later)
            if (e.target.closest('.remove-app-overlay')) {
                return;
            }
            app.isSelected = !app.isSelected; // Toggle selection
            appTile.classList.toggle('selected', app.isSelected);
            saveApplications(); // Save state immediately
            updateCounts();
        });

        appGridElement.appendChild(appTile);
    });

    // Add "Add App" tile at the end
    const addAppTile = document.createElement('div');
    addAppTile.className = 'add-app-tile';
    addAppTile.id = 'addAppButton'; // Re-use ID for event listener
    addAppTile.innerHTML = '<i class="fas fa-plus"></i><span>Add App</span>';
    appGridElement.appendChild(addAppTile);

    // Re-attach event listener for addAppButton (since it's re-rendered)
    addAppTile.addEventListener('click', handleAddApp);
}


// --- Event Handlers ---

async function handleAddApp() {
    const selectedApp = await window.electronAPI.selectAppPath();
    if (selectedApp) {
        const iconData = await window.electronAPI.getAppIcon(selectedApp.path);

        const exists = applications.some(app => app.path === selectedApp.path);
        if (!exists) {
            applications.push({
                name: selectedApp.name,
                path: selectedApp.path,
                iconPath: iconData,
                isSelected: false // New apps are not selected by default in this UI
            });
            await saveApplications();
            renderAppGrid();
            updateCounts();
        } else {
        }
    } else {
    }
}

addAppButton.addEventListener('click', handleAddApp); // Initial listener for the actual button


selectAllButton.addEventListener('click', () => {
    applications.forEach(app => app.isSelected = true);
    saveApplications();
    renderAppGrid();
    updateCounts();
});

clearSelectionButton.addEventListener('click', () => {
    applications.forEach(app => app.isSelected = false);
    saveApplications();
    renderAppGrid();
    updateCounts();
});

saveGroupButton.addEventListener('click', () => {
    const selectedApps = applications.filter(app => app.isSelected);
    if (selectedApps.length === 0) {
        return;
    }

    modalSelectedCount.textContent = selectedApps.length;
    groupNameInput.value = '';

    // Reset color picker
    colorOptions.forEach(opt => opt.classList.remove('selected'));
    colorOptions[0].classList.add('selected'); // Default to blue
    selectedAccentColor = colorOptions[0].dataset.color; // Set default color

    // Update preview based on current state
    // *** REMOVE THE LINE groupPreview.style.backgroundColor = var(--secondary-dark); ***
    groupPreview.querySelector('.group-preview-icon').style.backgroundColor = selectedAccentColor;
    previewGroupName.textContent = 'Group Name';
    previewAppCount.textContent = `${selectedApps.length} apps`;

    showModal(saveGroupModal);
});

// Modal Close Buttons
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        hideModal(saveGroupModal);
        hideModal(launchConfirmModal);
    });
});

// Save Group Modal Logic
groupNameInput.addEventListener('input', () => {
    previewGroupName.textContent = groupNameInput.value || 'Group Name';
    createGroupButton.disabled = !groupNameInput.value.trim(); // Disable if name is empty
});

colorOptions.forEach(option => {
    option.addEventListener('click', () => {
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedAccentColor = option.dataset.color;
        groupPreview.querySelector('.group-preview-icon').style.backgroundColor = selectedAccentColor;
    });
});

createGroupButton.addEventListener('click', async () => {
    const groupName = groupNameInput.value.trim();
    if (!groupName) {
        alert('Please enter a group name.');
        return;
    }

    const selectedApps = applications.filter(app => app.isSelected);
    if (selectedApps.length === 0) {
        alert('No applications are selected to form a group.');
        return;
    }

    const newGroup = {
        id: Date.now(), // Simple unique ID
        name: groupName,
        accentColor: selectedAccentColor,
        appPaths: selectedApps.map(app => app.path)
    };

    appGroups.push(newGroup);
    await saveGroups();
    renderGroups();
    hideModal(saveGroupModal);
});

// Launch Confirmation Modal Logic
launchSelectedButton.addEventListener('click', () => {
    const selectedApps = applications.filter(app => app.isSelected);
    if (selectedApps.length === 0) {
        return;
    }

    launchModalSelectedCount.textContent = selectedApps.length;
    launchAppList.innerHTML = '';
    selectedApps.forEach(app => {
        const li = document.createElement('li');
        li.className = 'launch-app-item';
        li.innerHTML = `
            <img src="${app.iconPath || './assets/default-app-icon.png'}" alt="${app.name} icon">
            <span>${app.name}</span>
            <i class="fas fa-check-circle"></i>
        `;
        launchAppList.appendChild(li);
    });
    showModal(launchConfirmModal);
});

themeToggleButton.addEventListener('click', () => {
    document.body.classList.toggle('light-theme'); // Add/remove a class for theme
    // You would then define .light-theme in your CSS to change colors
    const icon = themeToggleButton.querySelector('i');
    if (document.body.classList.contains('light-theme')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        themeToggleButton.title = 'Switch to Dark Mode';
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        themeToggleButton.title = 'Switch to Light Mode';
    }
});

confirmLaunchButton.addEventListener('click', async () => {
    hideModal(launchConfirmModal);
    const selectedApps = applications.filter(app => app.isSelected);

    for (const app of selectedApps) {
        const result = await window.electronAPI.launchApp(app.path);
        if (!result.success) {
        }
    }
});


// Initial Loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadApplications();
    await loadGroups();
    updateCounts();
});