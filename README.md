# Windows Application Launcher

A desktop automation tool designed to launch multiple Windows applications simultaneously. Built with Electron, it allows users to create groups of applications (e.g., "Work", "Gaming") and open them all with a single click.

## Features

### 🎨 Modern UI/UX - Needs Update
*   **Sleek Interface**: Dark-themed design inspired by modern Windows UI with squircle-shaped icons.
*   **Custom Title Bar**: A non-native title bar with integrated window controls.
*   **Responsive Layout**: Adapts to different window sizes.
*   **Theme Toggle**: Switch between dark and light themes.

### 🚀 Application Management
*   **Auto-Discovery**: Automatically detects common applications (Chrome, VS Code, Spotify, Slack, etc.) installed on your system.
*   **Manual Addition**: Browse and add any executable (`.exe`) or shortcut (`.lnk`).
*   **Smart Selection**: Select/deselect apps individually or use "Select All".
*   **Persistence**: Added applications and selections are saved locally.

### 📁 Group Management
*   **Create Groups**: Save your current selection of apps as a named group.
*   **Visual Tiles**: Groups are displayed as interactive tiles with app counts and accent colors.
*   **One-Click Load**: Clicking a group automatically selects all apps within it.
*   **Persistence**: Groups are saved across app restarts.

### ⚡ Launching
*   **Simultaneous Launch**: Opens all selected applications in parallel.
*   **Safety Check**: A confirmation modal lists apps before launching to prevent accidental opens.


## Technologies

*   **Electron**: Framework for building desktop apps.
*   **Node.js**: Handles file system operations and process launching.
*   **IPC**: Communicates between the UI and the main process.

## Roadmap

*   [ ] Search functionality for applications.
*   [ ] List view mode.
*   [ ] Advanced group editing (rename, modify items).
*   [ ] Settings and History.
*   [ ] Build distributable `.exe` installer.