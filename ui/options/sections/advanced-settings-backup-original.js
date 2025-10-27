// Advanced Settings Management for Dashboard Integration
class AdvancedSettingsManager {
    constructor() {
        this.settings = {
            // Core Extension Settings
            core: {
                enabled: true,
                autoSuspendTime: 30,
                suspendPinned: false,
                suspendAudible: false,
                suspendOnLowMemory: true,
                suspendInBackground: true,
            },

            // Dashboard Settings
            dashboard: {
                autoRefresh: true,
                refreshInterval: 30,
                showQuickStats: true,
                showFeatureStatus: true,
                compactMode: false,
                theme: "auto",
            },

            // Analytics Settings
            analytics: {
                enableTracking: true,
                trackPerformance: true,
                trackProductivity: true,
                retentionDays: 90,
                generateInsights: true,
                exportFormat: "json",
            },

            // Privacy Settings
            privacy: {
                dataRetention: true,
                retentionDays: 365,
                encryption: true,
                analytics: false,
                autoCleanup: true,
                cloudSharing: false,
                gdprCompliance: true,
            },

            // Focus Mode Settings
            focus: {
                enabled: false,
                blockSocial: true,
                blockNews: false,
                blockShopping: false,
                allowedSites: [],
                blockedSites: [],
                sessionDuration: 25,
                breakDuration: 5,
                dailyGoal: 4,
            },

            // Cloud Backup Settings
            cloud: {
                provider: null,
                autoSync: false,
                syncInterval: "daily",
                encryptBackups: true,
                maxBackups: 10,
                syncSessions: true,
                syncSettings: true,
                syncAnalytics: false,
            },

            // Performance Settings
            performance: {
                aggressiveMode: false,
                memoryThreshold: 80,
                cpuThreshold: 70,
                suspendDelay: 5,
                preloadImportant: true,
                optimizeImages: true,
                compressData: true,
            },

            // UI/UX Settings
            interface: {
                showNotifications: true,
                notificationDuration: 3,
                soundEffects: false,
                confirmActions: true,
                tooltips: true,
                animations: true,
                keyboardShortcuts: true,
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
            const stored = await chrome.storage.sync.get("advancedSettings");
            if (stored.advancedSettings) {
                this.settings = {
                    ...this.settings,
                    ...stored.advancedSettings,
                };
            }
        } catch (error) {
            console.error("Error loading advanced settings:", error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                advancedSettings: this.settings,
            });
            console.log("Advanced settings saved");
        } catch (error) {
            console.error("Error saving advanced settings:", error);
        }
    }

    setupEventListeners() {
        // Dashboard settings
        this.setupToggle("dashboard-auto-refresh", "dashboard.autoRefresh");
        this.setupRange(
            "dashboard-refresh-interval",
            "dashboard.refreshInterval"
        );
        this.setupToggle("dashboard-compact-mode", "dashboard.compactMode");
        this.setupSelect("dashboard-theme", "dashboard.theme");

        // Analytics settings
        this.setupToggle(
            "analytics-enable-tracking",
            "analytics.enableTracking"
        );
        this.setupToggle(
            "analytics-track-performance",
            "analytics.trackPerformance"
        );
        this.setupToggle(
            "analytics-track-productivity",
            "analytics.trackProductivity"
        );
        this.setupRange("analytics-retention-days", "analytics.retentionDays");

        // Privacy settings
        this.setupToggle("privacy-data-retention", "privacy.dataRetention");
        this.setupRange("privacy-retention-days", "privacy.retentionDays");
        this.setupToggle("privacy-encryption", "privacy.encryption");
        this.setupToggle("privacy-analytics", "privacy.analytics");
        this.setupToggle("privacy-auto-cleanup", "privacy.autoCleanup");

        // Focus mode settings
        this.setupToggle("focus-enabled", "focus.enabled");
        this.setupToggle("focus-block-social", "focus.blockSocial");
        this.setupToggle("focus-block-news", "focus.blockNews");
        this.setupRange("focus-session-duration", "focus.sessionDuration");
        this.setupRange("focus-daily-goal", "focus.dailyGoal");

        // Cloud settings
        this.setupSelect("cloud-provider", "cloud.provider");
        this.setupToggle("cloud-auto-sync", "cloud.autoSync");
        this.setupSelect("cloud-sync-interval", "cloud.syncInterval");
        this.setupToggle("cloud-encrypt-backups", "cloud.encryptBackups");

        // Performance settings
        this.setupToggle(
            "performance-aggressive-mode",
            "performance.aggressiveMode"
        );
        this.setupRange(
            "performance-memory-threshold",
            "performance.memoryThreshold"
        );
        this.setupRange(
            "performance-cpu-threshold",
            "performance.cpuThreshold"
        );
        this.setupToggle(
            "performance-optimize-images",
            "performance.optimizeImages"
        );

        // Interface settings
        this.setupToggle(
            "interface-show-notifications",
            "interface.showNotifications"
        );
        this.setupRange(
            "interface-notification-duration",
            "interface.notificationDuration"
        );
        this.setupToggle("interface-sound-effects", "interface.soundEffects");
        this.setupToggle("interface-animations", "interface.animations");
    }

    setupToggle(elementId, settingPath) {
        const element = document.getElementById(elementId);
        if (element) {
            const currentValue = this.getNestedSetting(settingPath);
            element.checked = currentValue;

            element.addEventListener("change", async (e) => {
                this.setNestedSetting(settingPath, e.target.checked);
                await this.saveSettings();
                this.applySettings();
                this.showSettingsSaved();
            });
        }
    }

    setupRange(elementId, settingPath) {
        const element = document.getElementById(elementId);
        if (element) {
            const currentValue = this.getNestedSetting(settingPath);
            element.value = currentValue;

            // Update display value
            const displayElement = document.getElementById(
                elementId + "-value"
            );
            if (displayElement) {
                displayElement.textContent = currentValue;
            }

            element.addEventListener("input", (e) => {
                if (displayElement) {
                    displayElement.textContent = e.target.value;
                }
            });

            element.addEventListener("change", async (e) => {
                this.setNestedSetting(settingPath, parseInt(e.target.value));
                await this.saveSettings();
                this.applySettings();
                this.showSettingsSaved();
            });
        }
    }

    setupSelect(elementId, settingPath) {
        const element = document.getElementById(elementId);
        if (element) {
            const currentValue = this.getNestedSetting(settingPath);
            element.value = currentValue;

            element.addEventListener("change", async (e) => {
                this.setNestedSetting(settingPath, e.target.value);
                await this.saveSettings();
                this.applySettings();
                this.showSettingsSaved();
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

    applySettings() {
        // Apply dashboard settings
        if (this.settings.dashboard.autoRefresh) {
            this.startDashboardRefresh();
        } else {
            this.stopDashboardRefresh();
        }

        // Apply theme
        this.applyTheme(this.settings.dashboard.theme);

        // Send settings to background script
        chrome.runtime.sendMessage({
            action: "updateAdvancedSettings",
            settings: this.settings,
        });
    }

    applyTheme(theme) {
        const body = document.body;
        body.classList.remove("theme-light", "theme-dark", "theme-auto");

        if (theme === "auto") {
            // Use system preference
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;
            body.classList.add(prefersDark ? "theme-dark" : "theme-light");
        } else {
            body.classList.add(`theme-${theme}`);
        }
    }

    startDashboardRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        const interval = this.settings.dashboard.refreshInterval * 1000;
        this.refreshInterval = setInterval(() => {
            this.refreshDashboard();
        }, interval);
    }

    stopDashboardRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    refreshDashboard() {
        // Trigger dashboard refresh if on dashboard page
        if (window.dashboardInstance) {
            window.dashboardInstance.loadQuickStats();
        }
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
        a.download = `tab-suspend-pro-settings-${
            new Date().toISOString().split("T")[0]
        }.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async importSettings(fileContent) {
        try {
            const importData = JSON.parse(fileContent);

            if (importData.settings) {
                this.settings = { ...this.settings, ...importData.settings };
                await this.saveSettings();
                this.applySettings();

                // Refresh UI
                location.reload();

                return {
                    success: true,
                    imported: Object.keys(importData.settings).length,
                };
            }

            return { success: false, error: "Invalid settings file format" };
        } catch (error) {
            console.error("Error importing settings:", error);
            return { success: false, error: "Failed to parse settings file" };
        }
    }

    async resetAllSettings() {
        if (
            confirm(
                "Are you sure you want to reset ALL settings to defaults? This cannot be undone."
            )
        ) {
            // Reset to defaults
            this.settings = {
                core: {
                    enabled: true,
                    autoSuspendTime: 30,
                    suspendPinned: false,
                    suspendAudible: false,
                    suspendOnLowMemory: true,
                    suspendInBackground: true,
                },
                dashboard: {
                    autoRefresh: true,
                    refreshInterval: 30,
                    showQuickStats: true,
                    showFeatureStatus: true,
                    compactMode: false,
                    theme: "auto",
                },
                analytics: {
                    enableTracking: true,
                    trackPerformance: true,
                    trackProductivity: true,
                    retentionDays: 90,
                    generateInsights: true,
                    exportFormat: "json",
                },
                privacy: {
                    dataRetention: true,
                    retentionDays: 365,
                    encryption: true,
                    analytics: false,
                    autoCleanup: true,
                    cloudSharing: false,
                    gdprCompliance: true,
                },
                focus: {
                    enabled: false,
                    blockSocial: true,
                    blockNews: false,
                    blockShopping: false,
                    allowedSites: [],
                    blockedSites: [],
                    sessionDuration: 25,
                    breakDuration: 5,
                    dailyGoal: 4,
                },
                cloud: {
                    provider: null,
                    autoSync: false,
                    syncInterval: "daily",
                    encryptBackups: true,
                    maxBackups: 10,
                    syncSessions: true,
                    syncSettings: true,
                    syncAnalytics: false,
                },
                performance: {
                    aggressiveMode: false,
                    memoryThreshold: 80,
                    cpuThreshold: 70,
                    suspendDelay: 5,
                    preloadImportant: true,
                    optimizeImages: true,
                    compressData: true,
                },
                interface: {
                    showNotifications: true,
                    notificationDuration: 3,
                    soundEffects: false,
                    confirmActions: true,
                    tooltips: true,
                    animations: true,
                    keyboardShortcuts: true,
                },
            };

            await this.saveSettings();
            this.applySettings();
            location.reload();
        }
    }

    getSettingsForExport() {
        return {
            version: "2.1.0",
            exported: new Date().toISOString(),
            settings: this.settings,
        };
    }
}

// Global instance
let advancedSettingsManager;

// Initialize when DOM loads
document.addEventListener("DOMContentLoaded", () => {
    advancedSettingsManager = new AdvancedSettingsManager();

    // Tab switching functionality
    document.querySelectorAll(".tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            // Remove active from all tabs and content
            document
                .querySelectorAll(".tab")
                .forEach((t) => t.classList.remove("active"));
            document
                .querySelectorAll(".tab-content")
                .forEach((tc) => tc.classList.remove("active"));

            // Add active to clicked tab and corresponding content
            tab.classList.add("active");
            const tabId = tab.getAttribute("data-tab");
            document.getElementById(tabId).classList.add("active");
        });
    });

    // File input wrapper click handler
    const fileInputWrapper = document.querySelector(".file-input-wrapper");
    if (fileInputWrapper) {
        fileInputWrapper.addEventListener("click", () => {
            document.getElementById("import-file").click();
        });
    }

    // Button event handlers
    const exportBtn = document.getElementById("export-settings-btn");
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            exportAdvancedSettings();
        });
    }

    const importBtn = document.getElementById("import-settings-btn");
    if (importBtn) {
        importBtn.addEventListener("click", () => {
            document.getElementById("import-file").click();
        });
    }

    const dashboardBtn = document.getElementById("open-dashboard-btn");
    if (dashboardBtn) {
        dashboardBtn.addEventListener("click", () => {
            window.open("main-dashboard.html", "_blank");
        });
    }

    const resetBtn = document.getElementById("reset-settings-btn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            resetAdvancedSettings();
        });
    }

    // File input change handler
    const importFile = document.getElementById("import-file");
    if (importFile) {
        importFile.addEventListener("change", (event) => {
            importAdvancedSettings(event);
        });
    }
});

// Export functions for HTML buttons
window.exportAdvancedSettings = () => {
    if (advancedSettingsManager) {
        advancedSettingsManager.exportSettings();
    }
};

window.importAdvancedSettings = (event) => {
    const file = event.target.files[0];
    if (file && advancedSettingsManager) {
        const reader = new FileReader();
        reader.onload = (e) => {
            advancedSettingsManager.importSettings(e.target.result);
        };
        reader.readAsText(file);
    }
};

window.resetAdvancedSettings = () => {
    if (advancedSettingsManager) {
        advancedSettingsManager.resetAllSettings();
    }
};
