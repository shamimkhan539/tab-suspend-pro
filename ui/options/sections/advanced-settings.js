// Consolidated Advanced Settings Manager
class ConsolidatedSettingsManager {
    constructor() {
        this.settings = {
            // General Settings
            general: {
                suspendTime: 30,
                timeUnit: "minutes",
                suspendAudio: false,
                showNotifications: true,
                aggressiveMode: false,
                whitelist: [],
                enableAnalytics: true,
                enablePerformanceTracking: true,
                exportInterval: "never",
            },

            // Tracker Blocker Settings
            trackerBlocker: {
                enabled: true,
                blockAds: true,
                blockTrackers: true,
                blockSocial: false,
                blockMining: false,
                blockMalware: true,
                whitelist: [],
            },

            // Ads Blocker Settings
            adsBlocker: {
                enabled: true,
                blockYoutubeAds: true,
                blockYoutubeMusicAds: true,
                blockGeneralAds: true,
                blockAnalytics: true,
                blockCookies: true,
                whitelist: [],
            },

            // Privacy Settings
            privacy: {
                dataRetention: true,
                retentionDays: 365,
                encryption: true,
                autoCleanup: true,
                gdprCompliance: true,
            },

            // Focus Mode Settings
            focus: {
                autoEnable: false,
                workStart: "09:00",
                workEnd: "17:00",
                action: "warn",
            },

            // Performance Settings
            performance: {
                trackingEnabled: true,
            },

            // Cloud Backup Settings
            cloud: {
                provider: null,
                googleDriveEnabled: false,
                backupFrequency: "weekly",
                syncEnabled: false,
                lastBackup: null,
            },

            // Interface Settings
            interface: {
                sessionsEnabled: true,
                analyticsTabEnabled: true,
                organizationEnabled: true,
            },
        };

        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.applySettings();
    }

    async loadSettings() {
        try {
            const stored = await chrome.storage.sync.get([
                "consolidatedSettings",
            ]);
            if (stored.consolidatedSettings) {
                this.settings = {
                    ...this.settings,
                    ...stored.consolidatedSettings,
                };
            }
        } catch (error) {
            console.error("Error loading consolidated settings:", error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                consolidatedSettings: this.settings,
            });
            this.showSettingsSaved();
        } catch (error) {
            console.error("Error saving consolidated settings:", error);
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll(".tab").forEach((tab) => {
            tab.addEventListener("click", () => {
                this.switchTab(tab);
            });
        });

        // General Settings
        this.setupToggle("audio-toggle", "general.suspendAudio");
        this.setupToggle("notifications-toggle", "general.showNotifications");
        this.setupToggle("aggressive-toggle", "general.aggressiveMode");
        this.setupToggle("analytics-toggle", "general.enableAnalytics");
        this.setupToggle(
            "performance-toggle",
            "general.enablePerformanceTracking"
        );

        // Tracker Blocker Settings
        this.setupToggle("tracker-blocker-enabled", "trackerBlocker.enabled");
        this.setupToggle("block-ads", "trackerBlocker.blockAds");
        this.setupToggle("block-trackers", "trackerBlocker.blockTrackers");
        this.setupToggle("block-social", "trackerBlocker.blockSocial");
        this.setupToggle("block-mining", "trackerBlocker.blockMining");
        this.setupToggle("block-malware", "trackerBlocker.blockMalware");

        // Ads Blocker Settings
        this.setupToggle("ads-blocker-enabled", "adsBlocker.enabled");
        this.setupToggle("ads-block-youtube", "adsBlocker.blockYoutubeAds");
        this.setupToggle(
            "ads-block-youtube-music",
            "adsBlocker.blockYoutubeMusicAds"
        );
        this.setupToggle("ads-block-ads", "adsBlocker.blockGeneralAds");
        this.setupToggle("ads-block-analytics", "adsBlocker.blockAnalytics");
        this.setupToggle("ads-block-cookies", "adsBlocker.blockCookies");

        // Privacy Settings
        this.setupToggle("privacy-retention", "privacy.dataRetention");
        this.setupToggle("privacy-encryption", "privacy.encryption");
        this.setupToggle("privacy-cleanup", "privacy.autoCleanup");

        // Focus Mode Settings
        this.setupToggle("auto-focus-toggle", "focus.autoEnable");
        this.setupTimeInput("work-start", "focus.workStart");
        this.setupTimeInput("work-end", "focus.workEnd");
        this.setupSelect("focus-action", "focus.action");

        // Cloud Settings
        this.setupToggle("google-drive-toggle", "cloud.googleDriveEnabled");
        this.setupSelect("backup-frequency", "cloud.backupFrequency");
        this.setupToggle("sync-toggle", "cloud.syncEnabled");

        // Interface Settings
        this.setupToggle("sessions-toggle", "interface.sessionsEnabled");
        this.setupToggle(
            "analytics-enabled-toggle",
            "interface.analyticsTabEnabled"
        );
        this.setupToggle(
            "organization-toggle",
            "interface.organizationEnabled"
        );

        // URL List Management
        document.getElementById("add-url")?.addEventListener("click", () => {
            this.addUrlToList("new-url", "url-list", "general.whitelist");
        });

        document
            .getElementById("add-tracker-whitelist")
            ?.addEventListener("click", () => {
                this.addUrlToList(
                    "tracker-whitelist-url",
                    "tracker-whitelist-list",
                    "trackerBlocker.whitelist"
                );
            });

        document
            .getElementById("add-ads-whitelist")
            ?.addEventListener("click", () => {
                this.addUrlToList(
                    "ads-whitelist-url",
                    "ads-whitelist-list",
                    "adsBlocker.whitelist"
                );
            });

        // Dashboard Links
        document
            .getElementById("open-dashboard-btn")
            ?.addEventListener("click", () => {
                window.open(
                    chrome.runtime.getURL(
                        "ui/dashboards/main/main-dashboard.html"
                    ),
                    "_blank"
                );
            });

        document
            .getElementById("open-privacy-dashboard")
            ?.addEventListener("click", () => {
                window.open(
                    chrome.runtime.getURL(
                        "ui/dashboards/privacy/privacy-dashboard.html"
                    ),
                    "_blank"
                );
            });

        document
            .getElementById("open-analytics-dashboard")
            ?.addEventListener("click", () => {
                window.open(
                    chrome.runtime.getURL(
                        "ui/dashboards/analytics/analytics-dashboard.html"
                    ),
                    "_blank"
                );
            });

        // Backup/Export/Import
        document
            .getElementById("export-settings-btn")
            ?.addEventListener("click", () => this.exportSettings());

        document
            .getElementById("import-settings-btn")
            ?.addEventListener("click", () => {
                document.getElementById("import-file").click();
            });

        document
            .getElementById("import-file")
            ?.addEventListener("change", (e) => this.importSettings(e));

        document
            .getElementById("reset-settings-btn")
            ?.addEventListener("click", () => this.resetAllSettings());

        document
            .getElementById("export-settings")
            ?.addEventListener("click", () => this.exportSettings());

        document
            .getElementById("import-settings")
            ?.addEventListener("click", () => {
                document.getElementById("import-file").click();
            });

        document
            .getElementById("backup-now")
            ?.addEventListener("click", () => this.backupNow());

        document
            .getElementById("export-all-settings")
            ?.addEventListener("click", () => this.exportAllSettings());

        document
            .getElementById("import-all-settings")
            ?.addEventListener("click", () => {
                document.getElementById("import-all-file").click();
            });

        document
            .getElementById("import-all-file")
            ?.addEventListener("change", (e) => this.importAllSettings(e));

        document
            .getElementById("reset-all-settings")
            ?.addEventListener("click", () => this.resetAllSettings());

        // Load and display URL lists
        this.loadUrlLists();
    }

    switchTab(tab) {
        document.querySelectorAll(".tab").forEach((t) => {
            t.classList.remove("active");
        });
        document.querySelectorAll(".tab-content").forEach((tc) => {
            tc.classList.remove("active");
        });

        tab.classList.add("active");
        const tabId = tab.getAttribute("data-tab");
        document.getElementById(tabId)?.classList.add("active");
    }

    setupToggle(elementId, settingPath) {
        const element = document.getElementById(elementId);
        if (element) {
            const currentValue = this.getNestedSetting(settingPath);
            element.classList.toggle("active", currentValue);

            element.addEventListener("click", async (e) => {
                e.preventDefault();
                const newValue = !this.getNestedSetting(settingPath);
                this.setNestedSetting(settingPath, newValue);
                element.classList.toggle("active", newValue);
                await this.saveSettings();
            });
        }
    }

    setupSelect(elementId, settingPath) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = this.getNestedSetting(settingPath);
            element.addEventListener("change", async (e) => {
                this.setNestedSetting(settingPath, e.target.value);
                await this.saveSettings();
            });
        }
    }

    setupTimeInput(elementId, settingPath) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = this.getNestedSetting(settingPath);
            element.addEventListener("change", async (e) => {
                this.setNestedSetting(settingPath, e.target.value);
                await this.saveSettings();
            });
        }
    }

    getNestedSetting(path) {
        const keys = path.split(".");
        let current = this.settings;
        for (const key of keys) {
            current = current[key];
            if (current === undefined) return null;
        }
        return current;
    }

    setNestedSetting(path, value) {
        const keys = path.split(".");
        let current = this.settings;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    }

    addUrlToList(inputId, listId, settingPath) {
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);

        if (!input || !list) return;

        const url = input.value.trim();
        if (!url) return;

        const urls = this.getNestedSetting(settingPath);
        if (!urls.includes(url)) {
            urls.push(url);
            this.saveSettings();
            input.value = "";
            this.renderUrlList(listId, urls, settingPath);
        }
    }

    loadUrlLists() {
        this.renderUrlList(
            "url-list",
            this.settings.general.whitelist,
            "general.whitelist"
        );
        this.renderUrlList(
            "tracker-whitelist-list",
            this.settings.trackerBlocker.whitelist,
            "trackerBlocker.whitelist"
        );
        this.renderUrlList(
            "ads-whitelist-list",
            this.settings.adsBlocker.whitelist,
            "adsBlocker.whitelist"
        );
    }

    renderUrlList(listId, urls, settingPath) {
        const list = document.getElementById(listId);
        if (!list) return;

        list.innerHTML = urls
            .map(
                (url) => `
            <li class="url-item">
                <span>${url}</span>
                <button class="btn btn-danger" onclick="settingsManager.removeUrl('${settingPath}', '${url}')">Remove</button>
            </li>
        `
            )
            .join("");
    }

    async removeUrl(settingPath, url) {
        const urls = this.getNestedSetting(settingPath);
        const index = urls.indexOf(url);
        if (index > -1) {
            urls.splice(index, 1);
            await this.saveSettings();

            // Re-render the list
            const listId = this.getListIdForPath(settingPath);
            this.renderUrlList(listId, urls, settingPath);
        }
    }

    getListIdForPath(settingPath) {
        const mapping = {
            "general.whitelist": "url-list",
            "trackerBlocker.whitelist": "tracker-whitelist-list",
            "adsBlocker.whitelist": "ads-whitelist-list",
        };
        return mapping[settingPath] || "url-list";
    }

    showSettingsSaved() {
        const notification = document.createElement("div");
        notification.className = "settings-notification";
        notification.textContent = "✅ Settings saved";

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    async exportSettings() {
        const exportData = {
            version: "2.1.0",
            exported: new Date().toISOString(),
            settings: this.settings,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `browserguard-settings-${
            new Date().toISOString().split("T")[0]
        }.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async importSettings(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                if (importData.settings) {
                    this.settings = {
                        ...this.settings,
                        ...importData.settings,
                    };
                    await this.saveSettings();
                    location.reload();
                }
            } catch (error) {
                console.error("Error importing settings:", error);
                alert("Failed to import settings file");
            }
        };
        reader.readAsText(file);
    }

    async exportAllSettings() {
        this.exportSettings();
    }

    async importAllSettings(event) {
        this.importSettings(event);
    }

    async backupNow() {
        this.settings.cloud.lastBackup = new Date().toISOString();
        await this.saveSettings();
        const lastBackupElement = document.getElementById("last-backup-time");
        if (lastBackupElement) {
            lastBackupElement.textContent = `Last backed up: ${new Date(
                this.settings.cloud.lastBackup
            ).toLocaleString()}`;
        }
    }

    async resetAllSettings() {
        if (
            !confirm(
                "Are you sure you want to reset ALL settings to defaults? This cannot be undone."
            )
        ) {
            return;
        }

        this.settings = {
            general: {
                suspendTime: 30,
                timeUnit: "minutes",
                suspendAudio: false,
                showNotifications: true,
                aggressiveMode: false,
                whitelist: [],
                enableAnalytics: true,
                enablePerformanceTracking: true,
                exportInterval: "never",
            },
            trackerBlocker: {
                enabled: true,
                blockAds: true,
                blockTrackers: true,
                blockSocial: false,
                blockMining: false,
                blockMalware: true,
                whitelist: [],
            },
            adsBlocker: {
                enabled: true,
                blockYoutubeAds: true,
                blockYoutubeMusicAds: true,
                blockGeneralAds: true,
                blockAnalytics: true,
                blockCookies: true,
                whitelist: [],
            },
            privacy: {
                dataRetention: true,
                retentionDays: 365,
                encryption: true,
                autoCleanup: true,
                gdprCompliance: true,
            },
            focus: {
                autoEnable: false,
                workStart: "09:00",
                workEnd: "17:00",
                action: "warn",
            },
            performance: {
                trackingEnabled: true,
            },
            cloud: {
                provider: null,
                googleDriveEnabled: false,
                backupFrequency: "weekly",
                syncEnabled: false,
                lastBackup: null,
            },
            interface: {
                sessionsEnabled: true,
                analyticsTabEnabled: true,
                organizationEnabled: true,
            },
        };

        await this.saveSettings();
        location.reload();
    }

    applySettings() {
        // Send to background script
        chrome.runtime.sendMessage({
            action: "updateConsolidatedSettings",
            settings: this.settings,
        });
    }
}

// Global instance
let settingsManager;

// Initialize when DOM loads
document.addEventListener("DOMContentLoaded", () => {
    settingsManager = new ConsolidatedSettingsManager();
});
