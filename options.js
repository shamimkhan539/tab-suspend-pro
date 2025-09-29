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
        };
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadTabGroups();
        await this.loadSavedGroups();
        this.setupEventListeners();
        this.setupSavedGroupsEventListeners();
        this.updateUI();
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
        // Enable toggle
        document
            .getElementById("enable-toggle")
            .addEventListener("click", () => {
                this.settings.enabled = !this.settings.enabled;
                this.updateUI();
            });

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
        // Enable toggle
        const enableToggle = document.getElementById("enable-toggle");
        enableToggle.classList.toggle("active", this.settings.enabled);

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

        // Update whitelist
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
