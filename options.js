// Options page script for Tab Suspend Pro
class OptionsManager {
    constructor() {
        this.settings = {
            enabled: true,
            autoSuspendTime: 30,
            timeUnit: "minutes",
            excludedGroups: [],
            whitelistedUrls: [
                "chrome://",
                "chrome-extension://",
                "edge://",
                "about:",
            ],
            suspendAudio: false,
            showNotifications: true,
            aggressiveMode: false,
            savedGroupsEnabled: false,
            // Individual feature controls
            sessionsEnabled: true,
            analyticsEnabled: true,
            organizationEnabled: true,
            // New advanced settings
            performanceMonitoring: true,
            dataExportInterval: "never",
            autoFocusModeEnabled: false,
            workStartTime: "09:00",
            workEndTime: "17:00",
            focusModeAction: "warn",
            smartGroupingEnabled: false,
            sessionAutoSaveInterval: "never",
            predictiveSuspension: false,
        };
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadTabGroups();
        await this.loadSavedGroups();
        this.setupEventListeners();
        this.setupSavedGroupsEventListeners();
        this.setupBackupEventListeners();
        this.updateUI();
        this.updateLastBackupTime();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                "tabSuspendSettings",
            ]);
            if (result.tabSuspendSettings) {
                this.settings = {
                    ...this.settings,
                    ...result.tabSuspendSettings,
                };
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                tabSuspendSettings: this.settings,
            });
            this.showStatusMessage("Settings saved successfully!", "success");
        } catch (error) {
            console.error("Error saving settings:", error);
            this.showStatusMessage(
                "Error saving settings. Please try again.",
                "error"
            );
        }
    }

    async loadTabGroups() {
        try {
            const groups = await chrome.tabGroups.query({});
            const groupList = document.getElementById("group-list");

            if (groups.length === 0) {
                groupList.innerHTML = `
          <div style="padding: 20px; text-align: center; color: #6c757d;">
            No tab groups found. Create some tab groups to see them here.
          </div>
        `;
                return;
            }

            groupList.innerHTML = "";

            for (const group of groups) {
                const tabs = await chrome.tabs.query({ groupId: group.id });
                const item = document.createElement("div");
                item.className = "group-item";

                const isExcluded = this.settings.excludedGroups.includes(
                    group.id
                );

                item.innerHTML = `
          <input type="checkbox" class="group-checkbox" data-group-id="${
              group.id
          }" ${isExcluded ? "checked" : ""}>
          <div class="group-name" style="color: ${group.color};">
            ${group.title || "Unnamed Group"}
          </div>
          <div class="group-count">${tabs.length} tabs</div>
        `;

                groupList.appendChild(item);
            }
        } catch (error) {
            console.error("Error loading tab groups:", error);
            document.getElementById("group-list").innerHTML = `
        <div style="padding: 20px; text-align: center; color: #dc3545;">
          Error loading tab groups. Please refresh the page.
        </div>
      `;
        }
    }

    setupEventListeners() {
        // Suspend time input
        document
            .getElementById("suspend-time")
            .addEventListener("input", (e) => {
                this.settings.autoSuspendTime = parseInt(e.target.value) || 30;
            });

        // Time unit select
        document.getElementById("time-unit").addEventListener("change", (e) => {
            this.settings.timeUnit = e.target.value;
        });

        // Saved groups toggle
        const savedGroupsToggle = document.getElementById(
            "saved-groups-toggle"
        );
        if (savedGroupsToggle) {
            savedGroupsToggle.addEventListener("click", () => {
                this.settings.savedGroupsEnabled =
                    !this.settings.savedGroupsEnabled;
                this.saveSettings();
                this.updateUI();
                this.updateSavedGroupsVisibility();
            });
        }

        // Sessions toggle
        const sessionsToggle = document.getElementById("sessions-toggle");
        if (sessionsToggle) {
            sessionsToggle.addEventListener("click", () => {
                this.settings.sessionsEnabled = !this.settings.sessionsEnabled;
                this.saveSettings();
                this.updateUI();
            });
        }

        // Analytics enabled toggle
        const analyticsEnabledToggle = document.getElementById(
            "analytics-enabled-toggle"
        );
        if (analyticsEnabledToggle) {
            analyticsEnabledToggle.addEventListener("click", () => {
                this.settings.analyticsEnabled =
                    !this.settings.analyticsEnabled;
                this.saveSettings();
                this.updateUI();
            });
        }

        // Organization toggle
        const organizationToggle = document.getElementById(
            "organization-toggle"
        );
        if (organizationToggle) {
            organizationToggle.addEventListener("click", () => {
                this.settings.organizationEnabled =
                    !this.settings.organizationEnabled;
                this.saveSettings();
                this.updateUI();
            });
        }

        // Group checkboxes (event delegation)
        document
            .getElementById("group-list")
            .addEventListener("change", (e) => {
                if (e.target.classList.contains("group-checkbox")) {
                    const groupId = parseInt(e.target.dataset.groupId);
                    if (e.target.checked) {
                        if (!this.settings.excludedGroups.includes(groupId)) {
                            this.settings.excludedGroups.push(groupId);
                        }
                    } else {
                        this.settings.excludedGroups =
                            this.settings.excludedGroups.filter(
                                (id) => id !== groupId
                            );
                    }
                }
            });

        // Add URL
        document.getElementById("add-url").addEventListener("click", () => {
            this.addWhitelistUrl();
        });

        document.getElementById("new-url").addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                this.addWhitelistUrl();
            }
        });

        // Audio toggle
        document
            .getElementById("audio-toggle")
            .addEventListener("click", () => {
                this.settings.suspendAudio = !this.settings.suspendAudio;
                this.updateUI();
            });

        // Notifications toggle
        document
            .getElementById("notifications-toggle")
            .addEventListener("click", () => {
                this.settings.showNotifications =
                    !this.settings.showNotifications;
                this.updateUI();
            });

        // Aggressive mode toggle
        document
            .getElementById("aggressive-toggle")
            .addEventListener("click", () => {
                this.settings.aggressiveMode = !this.settings.aggressiveMode;
                this.updateUI();
            });

        // Save button
        document
            .getElementById("save-settings")
            .addEventListener("click", () => {
                this.saveSettings();
            });

        // New advanced settings event listeners
        const analyticsToggle = document.getElementById("analytics-toggle");
        if (analyticsToggle) {
            analyticsToggle.addEventListener("click", () => {
                this.settings.analyticsEnabled =
                    !this.settings.analyticsEnabled;
                this.updateUI();
            });
        }

        const performanceToggle = document.getElementById("performance-toggle");
        if (performanceToggle) {
            performanceToggle.addEventListener("click", () => {
                this.settings.performanceMonitoring =
                    !this.settings.performanceMonitoring;
                this.updateUI();
            });
        }

        const exportInterval = document.getElementById("export-interval");
        if (exportInterval) {
            exportInterval.addEventListener("change", (e) => {
                this.settings.dataExportInterval = e.target.value;
            });
        }

        const autoFocusToggle = document.getElementById("auto-focus-toggle");
        if (autoFocusToggle) {
            autoFocusToggle.addEventListener("click", () => {
                this.settings.autoFocusModeEnabled =
                    !this.settings.autoFocusModeEnabled;
                this.updateUI();
            });
        }

        const workStart = document.getElementById("work-start");
        if (workStart) {
            workStart.addEventListener("change", (e) => {
                this.settings.workStartTime = e.target.value;
            });
        }

        const workEnd = document.getElementById("work-end");
        if (workEnd) {
            workEnd.addEventListener("change", (e) => {
                this.settings.workEndTime = e.target.value;
            });
        }

        const focusAction = document.getElementById("focus-action");
        if (focusAction) {
            focusAction.addEventListener("change", (e) => {
                this.settings.focusModeAction = e.target.value;
            });
        }

        const smartGroupingToggle = document.getElementById(
            "smart-grouping-toggle"
        );
        if (smartGroupingToggle) {
            smartGroupingToggle.addEventListener("click", () => {
                this.settings.smartGroupingEnabled =
                    !this.settings.smartGroupingEnabled;
                this.updateUI();
            });
        }

        const sessionInterval = document.getElementById("session-interval");
        if (sessionInterval) {
            sessionInterval.addEventListener("change", (e) => {
                this.settings.sessionAutoSaveInterval = e.target.value;
            });
        }

        const predictiveToggle = document.getElementById("predictive-toggle");
        if (predictiveToggle) {
            predictiveToggle.addEventListener("click", () => {
                this.settings.predictiveSuspension =
                    !this.settings.predictiveSuspension;
                this.updateUI();
            });
        }

        const customizeShortcuts = document.getElementById(
            "customize-shortcuts"
        );
        if (customizeShortcuts) {
            customizeShortcuts.addEventListener("click", () => {
                chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
            });
        }

        // Auto-save on changes
        document.addEventListener("change", () => {
            setTimeout(() => this.saveSettings(), 500);
        });
    }

    addWhitelistUrl() {
        const input = document.getElementById("new-url");
        const url = input.value.trim();

        if (url && !this.settings.whitelistedUrls.includes(url)) {
            this.settings.whitelistedUrls.push(url);
            input.value = "";
            this.updateWhitelistUI();
        }
    }

    removeWhitelistUrl(url) {
        this.settings.whitelistedUrls = this.settings.whitelistedUrls.filter(
            (u) => u !== url
        );
        this.updateWhitelistUI();
    }

    updateUI() {
        // Suspend time
        document.getElementById("suspend-time").value =
            this.settings.autoSuspendTime;
        document.getElementById("time-unit").value = this.settings.timeUnit;

        // Audio toggle
        const audioToggle = document.getElementById("audio-toggle");
        audioToggle.classList.toggle("active", this.settings.suspendAudio);

        // Notifications toggle
        const notificationsToggle = document.getElementById(
            "notifications-toggle"
        );
        notificationsToggle.classList.toggle(
            "active",
            this.settings.showNotifications
        );

        // Aggressive mode toggle
        const aggressiveToggle = document.getElementById("aggressive-toggle");
        aggressiveToggle.classList.toggle(
            "active",
            this.settings.aggressiveMode
        );

        // Saved groups toggle
        const savedGroupsToggle = document.getElementById(
            "saved-groups-toggle"
        );
        if (savedGroupsToggle) {
            savedGroupsToggle.classList.toggle(
                "active",
                this.settings.savedGroupsEnabled
            );
        }

        // Feature control toggles
        const sessionsToggle = document.getElementById("sessions-toggle");
        if (sessionsToggle) {
            sessionsToggle.classList.toggle(
                "active",
                this.settings.sessionsEnabled
            );
        }

        const analyticsEnabledToggle = document.getElementById(
            "analytics-enabled-toggle"
        );
        if (analyticsEnabledToggle) {
            analyticsEnabledToggle.classList.toggle(
                "active",
                this.settings.analyticsEnabled
            );
        }

        const organizationToggle = document.getElementById(
            "organization-toggle"
        );
        if (organizationToggle) {
            organizationToggle.classList.toggle(
                "active",
                this.settings.organizationEnabled
            );
        }

        // New advanced settings
        const analyticsToggle = document.getElementById("analytics-toggle");
        if (analyticsToggle) {
            analyticsToggle.classList.toggle(
                "active",
                this.settings.analyticsEnabled
            );
        }

        const performanceToggle = document.getElementById("performance-toggle");
        if (performanceToggle) {
            performanceToggle.classList.toggle(
                "active",
                this.settings.performanceMonitoring
            );
        }

        const exportInterval = document.getElementById("export-interval");
        if (exportInterval) {
            exportInterval.value = this.settings.dataExportInterval;
        }

        const autoFocusToggle = document.getElementById("auto-focus-toggle");
        if (autoFocusToggle) {
            autoFocusToggle.classList.toggle(
                "active",
                this.settings.autoFocusModeEnabled
            );
        }

        const workStart = document.getElementById("work-start");
        if (workStart) {
            workStart.value = this.settings.workStartTime;
        }

        const workEnd = document.getElementById("work-end");
        if (workEnd) {
            workEnd.value = this.settings.workEndTime;
        }

        const focusAction = document.getElementById("focus-action");
        if (focusAction) {
            focusAction.value = this.settings.focusModeAction;
        }

        const smartGroupingToggle = document.getElementById(
            "smart-grouping-toggle"
        );
        if (smartGroupingToggle) {
            smartGroupingToggle.classList.toggle(
                "active",
                this.settings.smartGroupingEnabled
            );
        }

        const sessionInterval = document.getElementById("session-interval");
        if (sessionInterval) {
            sessionInterval.value = this.settings.sessionAutoSaveInterval;
        }

        const predictiveToggle = document.getElementById("predictive-toggle");
        if (predictiveToggle) {
            predictiveToggle.classList.toggle(
                "active",
                this.settings.predictiveSuspension
            );
        }

        // Update existing elements
        this.updateWhitelistUI();
        this.updateSavedGroupsVisibility();
    }

    updateSavedGroupsVisibility() {
        const savedGroupsActions = document.querySelector(
            ".saved-groups-actions"
        );
        const savedGroupsList = document.getElementById("saved-groups-list");

        if (savedGroupsActions && savedGroupsList) {
            const display = this.settings.savedGroupsEnabled ? "flex" : "none";
            savedGroupsActions.style.display = display;
            savedGroupsList.style.display = this.settings.savedGroupsEnabled
                ? "block"
                : "none";
        }

        // Also update the saved groups section in popup if this is being called from there
        const popupSavedGroupsSection = document.getElementById(
            "saved-groups-section"
        );
        if (popupSavedGroupsSection) {
            popupSavedGroupsSection.style.display = this.settings
                .savedGroupsEnabled
                ? "block"
                : "none";
        }
    }

    updateWhitelistUI() {
        const urlList = document.getElementById("url-list");
        // Clear existing nodes to rebuild list without inline handlers (CSP friendly)
        urlList.textContent = "";

        const fragment = document.createDocumentFragment();

        this.settings.whitelistedUrls.forEach((url) => {
            const item = document.createElement("li");
            item.className = "url-item";

            const span = document.createElement("span");
            span.textContent = url;

            const btn = document.createElement("button");
            btn.className = "btn btn-danger";
            btn.type = "button";
            btn.textContent = "Remove";
            btn.addEventListener("click", () => {
                this.removeWhitelistUrl(url);
                // Persist immediately since button click does not trigger a change event
                this.saveSettings();
            });

            item.appendChild(span);
            item.appendChild(btn);
            fragment.appendChild(item);
        });

        urlList.appendChild(fragment);
    }

    // Saved Groups Management
    async loadSavedGroups() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "listSavedGroups",
            });
            const groups = response.success ? response.groups : [];
            this.renderSavedGroups(groups);
        } catch (error) {
            console.error("Error loading saved groups:", error);
            this.renderSavedGroups([]);
        }
    }

    renderSavedGroups(groups) {
        const container = document.getElementById("saved-groups-list");

        if (!groups || groups.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <div><strong>No saved groups yet</strong></div>
                    <div>Save your first tab group to get started!</div>
                </div>
            `;
            return;
        }

        container.innerHTML = groups
            .map((group) => {
                const colorMap = {
                    grey: "#9aa0a6",
                    blue: "#1a73e8",
                    red: "#d93025",
                    yellow: "#fbbc04",
                    green: "#34a853",
                    pink: "#e91e63",
                    purple: "#9c27b0",
                    cyan: "#00acc1",
                    orange: "#ff9800",
                };

                const colorStyle = colorMap[group.color] || "#9aa0a6";
                const createdDate = new Date(
                    group.createdAt
                ).toLocaleDateString();
                const previewUrls = group.tabs
                    .slice(0, 3)
                    .map((tab) => {
                        try {
                            return new URL(tab.url).hostname;
                        } catch {
                            return tab.url.substring(0, 30) + "...";
                        }
                    })
                    .join(", ");

                return `
                <div class="saved-group-item" data-group-id="${group.id}">
                    <div class="group-color-indicator" style="background-color: ${colorStyle};"></div>
                    <div class="saved-group-info">
                        <div class="saved-group-name">${this.escapeHtml(
                            group.name
                        )}</div>
                        <div class="saved-group-meta">
                            <span>📄 ${group.tabCount} tabs</span>
                            <span>📅 ${createdDate}</span>
                        </div>
                        <div class="group-preview">${this.escapeHtml(
                            previewUrls
                        )}</div>
                    </div>
                    <div class="saved-group-actions">
                        <button class="btn-small btn-restore" data-action="restore" data-group-id="${
                            group.id
                        }">
                            Restore
                        </button>
                        <button class="btn-small btn-restore-new" data-action="restore-new" data-group-id="${
                            group.id
                        }">
                            New Window
                        </button>
                        <button class="btn-small btn-rename" data-action="rename" data-group-id="${
                            group.id
                        }">
                            Rename
                        </button>
                        <button class="btn-small btn-delete" data-action="delete" data-group-id="${
                            group.id
                        }">
                            Delete
                        </button>
                    </div>
                </div>
            `;
            })
            .join("");
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    async setupSavedGroupsEventListeners() {
        // Save current window button
        document
            .getElementById("save-current-window")
            .addEventListener("click", async () => {
                try {
                    const name = prompt(
                        "Enter a name for this group:",
                        `Window Group ${new Date().toLocaleDateString()}`
                    );
                    if (!name) return;

                    const response = await chrome.runtime.sendMessage({
                        action: "saveTabGroup",
                        groupId: null,
                        options: { name },
                    });

                    if (response.success) {
                        await this.loadSavedGroups();
                        this.showStatusMessage(
                            `Saved "${name}" successfully!`,
                            "success"
                        );
                    } else {
                        this.showStatusMessage("Failed to save group", "error");
                    }
                } catch (error) {
                    console.error("Error saving window:", error);
                    this.showStatusMessage("Error saving group", "error");
                }
            });

        // Export groups button
        document
            .getElementById("export-groups")
            .addEventListener("click", async () => {
                try {
                    const response = await chrome.runtime.sendMessage({
                        action: "exportSavedGroups",
                    });
                    if (response.success) {
                        this.showStatusMessage(
                            `Exported ${response.result.count} groups`,
                            "success"
                        );
                    } else {
                        this.showStatusMessage(
                            "Failed to export groups",
                            "error"
                        );
                    }
                } catch (error) {
                    console.error("Error exporting groups:", error);
                    this.showStatusMessage("Error exporting groups", "error");
                }
            });

        // Import groups button and file input
        const importButton = document.getElementById("import-groups");
        importButton.addEventListener("click", () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.addEventListener("change", async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    const content = await file.text();
                    const mergeMode = confirm(
                        "Merge with existing groups? Click OK to merge, Cancel to replace all groups."
                    );

                    const response = await chrome.runtime.sendMessage({
                        action: "importSavedGroups",
                        fileContent: content,
                        mergeMode: mergeMode,
                    });

                    if (response.success) {
                        await this.loadSavedGroups();
                        this.showStatusMessage(
                            `Imported ${response.result.imported} groups${
                                response.result.duplicates > 0
                                    ? `, skipped ${response.result.duplicates} duplicates`
                                    : ""
                            }`,
                            "success"
                        );
                    } else {
                        this.showStatusMessage(
                            "Failed to import groups",
                            "error"
                        );
                    }
                } catch (error) {
                    console.error("Error importing groups:", error);
                    this.showStatusMessage(
                        "Error importing groups. Please check the file format.",
                        "error"
                    );
                }
            });
            input.click();
        });

        // Saved groups action buttons
        document
            .getElementById("saved-groups-list")
            .addEventListener("click", async (e) => {
                const action = e.target.dataset.action;
                const groupId = e.target.dataset.groupId;

                if (!action || !groupId) return;

                try {
                    switch (action) {
                        case "restore":
                            const restoreResponse =
                                await chrome.runtime.sendMessage({
                                    action: "restoreSavedGroup",
                                    groupId: groupId,
                                    options: { newWindow: false },
                                });
                            if (restoreResponse.success) {
                                this.showStatusMessage(
                                    "Group restored successfully!",
                                    "success"
                                );
                            }
                            break;

                        case "restore-new":
                            const restoreNewResponse =
                                await chrome.runtime.sendMessage({
                                    action: "restoreSavedGroup",
                                    groupId: groupId,
                                    options: { newWindow: true },
                                });
                            if (restoreNewResponse.success) {
                                this.showStatusMessage(
                                    "Group restored in new window!",
                                    "success"
                                );
                            }
                            break;

                        case "rename":
                            const groupResponse =
                                await chrome.runtime.sendMessage({
                                    action: "getSavedGroup",
                                    groupId: groupId,
                                });

                            if (groupResponse.success && groupResponse.group) {
                                const currentName = groupResponse.group.name;
                                const newName = prompt(
                                    "Enter new name:",
                                    currentName
                                );
                                if (!newName || newName === currentName) return;

                                // Update the group name
                                const updatedGroup = {
                                    ...groupResponse.group,
                                    name: newName,
                                };
                                const stored = await chrome.storage.local.get([
                                    "savedTabGroups",
                                ]);
                                const savedGroups = stored.savedTabGroups || {};
                                savedGroups[groupId] = updatedGroup;
                                await chrome.storage.local.set({
                                    savedTabGroups: savedGroups,
                                });

                                await this.loadSavedGroups();
                                this.showStatusMessage(
                                    "Group renamed successfully!",
                                    "success"
                                );
                            }
                            break;

                        case "delete":
                            const groupToDelete =
                                await chrome.runtime.sendMessage({
                                    action: "getSavedGroup",
                                    groupId: groupId,
                                });

                            if (groupToDelete.success && groupToDelete.group) {
                                const confirmDelete = confirm(
                                    `Are you sure you want to delete "${groupToDelete.group.name}"? This action cannot be undone.`
                                );
                                if (!confirmDelete) return;

                                const deleteResponse =
                                    await chrome.runtime.sendMessage({
                                        action: "deleteSavedGroup",
                                        groupId: groupId,
                                    });

                                if (deleteResponse.success) {
                                    await this.loadSavedGroups();
                                    this.showStatusMessage(
                                        "Group deleted successfully!",
                                        "success"
                                    );
                                }
                            }
                            break;
                    }
                } catch (error) {
                    console.error(`Error with action ${action}:`, error);
                    this.showStatusMessage(`Error: ${error.message}`, "error");
                }
            });
    }

    setupBackupEventListeners() {
        // Export settings
        const exportBtn = document.getElementById("export-settings");
        if (exportBtn) {
            exportBtn.addEventListener("click", () => this.exportSettings());
        }

        // Import settings
        const importBtn = document.getElementById("import-settings");
        const importFile = document.getElementById("import-file");
        if (importBtn && importFile) {
            importBtn.addEventListener("click", () => importFile.click());
            importFile.addEventListener("change", (e) =>
                this.importSettings(e)
            );
        }

        // Backup now
        const backupBtn = document.getElementById("backup-now");
        if (backupBtn) {
            backupBtn.addEventListener("click", () => this.backupNow());
        }

        // Google Drive toggle
        const driveToggle = document.getElementById("google-drive-toggle");
        if (driveToggle) {
            driveToggle.addEventListener("click", () =>
                this.toggleGoogleDrive()
            );
        }

        // Sync toggle
        const syncToggle = document.getElementById("sync-toggle");
        if (syncToggle) {
            syncToggle.addEventListener("click", () => this.toggleSync());
        }
    }

    async exportSettings() {
        try {
            // Get all settings and saved groups
            const [settingsResult, groupsResult] = await Promise.all([
                chrome.storage.sync.get(null),
                chrome.runtime.sendMessage({ action: "getAllSavedGroups" }),
            ]);

            const exportData = {
                settings: settingsResult,
                savedGroups: groupsResult.success ? groupsResult.groups : [],
                exportDate: new Date().toISOString(),
                version: "1.0",
            };

            // Create and download file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tab-suspend-pro-backup-${
                new Date().toISOString().split("T")[0]
            }.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showStatusMessage(
                "Settings exported successfully!",
                "success"
            );
            this.updateLastBackupTime();
        } catch (error) {
            console.error("Export failed:", error);
            this.showStatusMessage("Export failed: " + error.message, "error");
        }
    }

    async importSettings(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            if (!importData.settings || !importData.version) {
                throw new Error("Invalid backup file format");
            }

            // Confirm import
            const confirmed = confirm(
                "This will replace all current settings and saved groups. Are you sure you want to continue?"
            );
            if (!confirmed) return;

            // Import settings
            await chrome.storage.sync.clear();
            await chrome.storage.sync.set(importData.settings);

            // Import saved groups
            if (importData.savedGroups && importData.savedGroups.length > 0) {
                for (const group of importData.savedGroups) {
                    await chrome.runtime.sendMessage({
                        action: "saveTabGroup",
                        group: group,
                    });
                }
            }

            this.showStatusMessage(
                "Settings imported successfully! Please refresh the page.",
                "success"
            );

            // Reload the page after a delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error("Import failed:", error);
            this.showStatusMessage("Import failed: " + error.message, "error");
        }
    }

    async backupNow() {
        try {
            // For now, this is the same as export
            // In the future, this could backup to Google Drive
            await this.exportSettings();

            // Update last backup time
            await chrome.storage.sync.set({
                lastBackupTime: new Date().toISOString(),
            });
            this.updateLastBackupTime();
        } catch (error) {
            console.error("Backup failed:", error);
            this.showStatusMessage("Backup failed: " + error.message, "error");
        }
    }

    async toggleGoogleDrive() {
        // Placeholder for Google Drive integration
        this.showStatusMessage("Google Drive integration coming soon!", "info");
    }

    async toggleSync() {
        // This enables Chrome's built-in sync
        try {
            const syncEnabled = !this.settings.syncEnabled;
            this.settings.syncEnabled = syncEnabled;
            await this.saveSettings();

            const syncToggle = document.getElementById("sync-toggle");
            if (syncToggle) {
                syncToggle.classList.toggle("active", syncEnabled);
            }

            this.showStatusMessage(
                syncEnabled ? "Chrome sync enabled!" : "Chrome sync disabled!",
                "success"
            );
        } catch (error) {
            console.error("Sync toggle failed:", error);
            this.showStatusMessage(
                "Sync toggle failed: " + error.message,
                "error"
            );
        }
    }

    async updateLastBackupTime() {
        try {
            const result = await chrome.storage.sync.get(["lastBackupTime"]);
            const lastBackupElement =
                document.getElementById("last-backup-time");

            if (lastBackupElement) {
                if (result.lastBackupTime) {
                    const date = new Date(result.lastBackupTime);
                    lastBackupElement.textContent = `Last backup: ${date.toLocaleString()}`;
                } else {
                    lastBackupElement.textContent = "Never backed up";
                }
            }
        } catch (error) {
            console.error("Failed to update last backup time:", error);
        }
    }

    showStatusMessage(message, type) {
        const statusElement = document.getElementById("status-message");
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
        statusElement.style.display = "block";

        setTimeout(() => {
            statusElement.style.display = "none";
        }, 3000);
    }
}

// Initialize options manager
const optionsManager = new OptionsManager();
