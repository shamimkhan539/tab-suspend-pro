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
        };
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadTabGroups();
        this.setupEventListeners();
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

        // Update whitelist
        this.updateWhitelistUI();
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
