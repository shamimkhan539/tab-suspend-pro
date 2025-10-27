// Privacy and Data Management Module for BrowserGuard Pro
class PrivacyManager {
    constructor() {
        this.privacySettings = {
            dataRetentionDays: 30,
            encryptSensitiveData: true,
            clearDataOnUninstall: true,
            shareAnalytics: false,
            trackingProtection: true,
            incognitoMode: "ignore", // ignore, suspend, never
            localStorageOnly: false,
        };
        this.init();
    }

    async init() {
        await this.loadPrivacySettings();
        this.setupDataRetentionSchedule();
        console.log("Privacy Manager initialized");
    }

    async loadPrivacySettings() {
        try {
            const data = await chrome.storage.sync.get(["privacySettings"]);
            if (data.privacySettings) {
                this.privacySettings = {
                    ...this.privacySettings,
                    ...data.privacySettings,
                };
            }
        } catch (error) {
            console.error("Error loading privacy settings:", error);
        }
    }

    async savePrivacySettings() {
        try {
            await chrome.storage.sync.set({
                privacySettings: this.privacySettings,
            });
        } catch (error) {
            console.error("Error saving privacy settings:", error);
        }
    }

    // Data Retention and Cleanup
    setupDataRetentionSchedule() {
        // Create alarm for daily cleanup
        chrome.alarms.create("privacy-cleanup", {
            periodInMinutes: 1440, // Daily
        });
    }

    async performDataCleanup() {
        const cutoffDate =
            Date.now() -
            this.privacySettings.dataRetentionDays * 24 * 60 * 60 * 1000;

        try {
            // Clean old analytics data
            await this.cleanOldAnalytics(cutoffDate);

            // Clean old session data
            await this.cleanOldSessions(cutoffDate);

            // Clean old activity data
            await this.cleanOldActivity(cutoffDate);

            console.log(
                `Privacy cleanup completed. Removed data older than ${this.privacySettings.dataRetentionDays} days`
            );
        } catch (error) {
            console.error("Error during privacy cleanup:", error);
        }
    }

    async cleanOldAnalytics(cutoffDate) {
        const data = await chrome.storage.local.get([
            "performanceHistory",
            "activityHeatmap",
        ]);

        if (data.performanceHistory) {
            const cleanHistory = data.performanceHistory.filter(
                (entry) => entry.timestamp > cutoffDate
            );
            await chrome.storage.local.set({
                performanceHistory: cleanHistory,
            });
        }

        if (data.activityHeatmap) {
            const cleanHeatmap = {};
            for (const [dateKey, dayData] of Object.entries(
                data.activityHeatmap
            )) {
                const dayTimestamp = new Date(dateKey).getTime();
                if (dayTimestamp > cutoffDate) {
                    cleanHeatmap[dateKey] = dayData;
                }
            }
            await chrome.storage.local.set({ activityHeatmap: cleanHeatmap });
        }
    }

    async cleanOldSessions(cutoffDate) {
        const data = await chrome.storage.local.get(["sessionHistory"]);

        if (data.sessionHistory && Array.isArray(data.sessionHistory)) {
            const cleanSessions = data.sessionHistory.filter(
                (session) => session.timestamp > cutoffDate
            );
            await chrome.storage.local.set({ sessionHistory: cleanSessions });
        }
    }

    async cleanOldActivity(cutoffDate) {
        const data = await chrome.storage.local.get(["siteStats"]);

        if (data.siteStats) {
            const cleanStats = {};
            for (const [domain, stats] of Object.entries(data.siteStats)) {
                if (stats.lastVisit > cutoffDate) {
                    cleanStats[domain] = stats;
                }
            }
            await chrome.storage.local.set({ siteStats: cleanStats });
        }
    }

    // Data Encryption (Basic implementation)
    async encryptData(data) {
        if (!this.privacySettings.encryptSensitiveData) {
            return data;
        }

        try {
            // Simple base64 encoding for basic privacy (in production, use proper encryption)
            return btoa(JSON.stringify(data));
        } catch (error) {
            console.error("Error encrypting data:", error);
            return data;
        }
    }

    async decryptData(encryptedData) {
        if (!this.privacySettings.encryptSensitiveData) {
            return encryptedData;
        }

        try {
            return JSON.parse(atob(encryptedData));
        } catch (error) {
            console.error("Error decrypting data:", error);
            return encryptedData;
        }
    }

    // Privacy Controls
    async clearAllData() {
        if (
            !confirm(
                "Are you sure you want to clear all BrowserGuard Pro data? This cannot be undone."
            )
        ) {
            return false;
        }

        try {
            // Clear all local storage
            await chrome.storage.local.clear();

            // Clear sync storage (settings)
            await chrome.storage.sync.clear();

            console.log("All BrowserGuard Pro data cleared");
            return true;
        } catch (error) {
            console.error("Error clearing data:", error);
            return false;
        }
    }

    async exportPrivacyReport() {
        try {
            const allData = {};

            // Get all stored data
            const localStorage = await chrome.storage.local.get();
            const syncStorage = await chrome.storage.sync.get();

            const report = {
                exportDate: new Date().toISOString(),
                dataTypes: {
                    sessions: localStorage.sessionHistory?.length || 0,
                    analytics: Object.keys(localStorage.activityHeatmap || {})
                        .length,
                    siteStats: Object.keys(localStorage.siteStats || {}).length,
                    savedGroups: Object.keys(localStorage.savedTabGroups || {})
                        .length,
                    settings: Object.keys(syncStorage).length,
                },
                storageUsage: {
                    localStorageKeys: Object.keys(localStorage).length,
                    syncStorageKeys: Object.keys(syncStorage).length,
                    estimatedSize:
                        JSON.stringify({ ...localStorage, ...syncStorage })
                            .length + " bytes",
                },
                privacySettings: this.privacySettings,
                retentionStatus: {
                    dataRetentionDays: this.privacySettings.dataRetentionDays,
                    lastCleanup: localStorage.lastPrivacyCleanup || "Never",
                    nextCleanup: "Daily automatic cleanup",
                },
            };

            return report;
        } catch (error) {
            console.error("Error generating privacy report:", error);
            throw error;
        }
    }

    // Incognito Mode Handling
    shouldSuspendIncognito(tab) {
        if (!tab.incognito) return true;

        switch (this.privacySettings.incognitoMode) {
            case "never":
                return false;
            case "ignore":
                return false;
            case "suspend":
                return true;
            default:
                return false;
        }
    }

    // Tracking Protection
    async blockTrackingRequests(details) {
        if (!this.privacySettings.trackingProtection) {
            return {};
        }

        const trackingDomains = [
            "google-analytics.com",
            "googletagmanager.com",
            "facebook.com/tr",
            "twitter.com/i/adsct",
            "linkedin.com/li.lms-analytics",
            "bing.com/t/pixel",
            "snapchat.com/tr",
        ];

        const url = new URL(details.url);
        if (trackingDomains.some((domain) => url.hostname.includes(domain))) {
            console.log(`Blocked tracking request to: ${url.hostname}`);
            return { cancel: true };
        }

        return {};
    }

    // Data Export for Compliance
    async exportUserData() {
        try {
            const localStorage = await chrome.storage.local.get();
            const syncStorage = await chrome.storage.sync.get();

            const exportData = {
                exportInfo: {
                    version: "2.1.0",
                    exportDate: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                },
                settings: syncStorage,
                data: {
                    // Remove sensitive data if encryption is disabled
                    sessions: localStorage.sessionHistory || [],
                    analytics: localStorage.activityHeatmap || {},
                    siteStats: localStorage.siteStats || {},
                    savedGroups: localStorage.savedTabGroups || {},
                    performanceHistory: localStorage.performanceHistory || [],
                },
                privacy: {
                    settings: this.privacySettings,
                    notice: "This export contains all data stored by BrowserGuard Pro. Handle with care.",
                },
            };

            // Apply encryption if enabled
            if (this.privacySettings.encryptSensitiveData) {
                exportData.data = await this.encryptData(exportData.data);
                exportData.encrypted = true;
            }

            return exportData;
        } catch (error) {
            console.error("Error exporting user data:", error);
            throw error;
        }
    }

    // GDPR Compliance Methods
    async handleDataRequest(requestType) {
        switch (requestType) {
            case "access":
                return await this.exportUserData();
            case "rectification":
                // Open settings page for user to modify their data
                chrome.tabs.create({
                    url: chrome.runtime.getURL("options.html"),
                });
                break;
            case "erasure":
                return await this.clearAllData();
            case "portability":
                return await this.exportUserData();
            case "restriction":
                // Disable data collection temporarily
                this.privacySettings.shareAnalytics = false;
                this.privacySettings.trackingProtection = true;
                await this.savePrivacySettings();
                break;
        }
    }

    // Get privacy dashboard data
    async getPrivacyDashboard() {
        try {
            const localStorage = await chrome.storage.local.get();
            const syncStorage = await chrome.storage.sync.get();

            return {
                dataOverview: {
                    totalSessions: localStorage.sessionHistory?.length || 0,
                    totalSiteStats: Object.keys(localStorage.siteStats || {})
                        .length,
                    totalAnalytics: Object.keys(
                        localStorage.activityHeatmap || {}
                    ).length,
                    settingsCount: Object.keys(syncStorage).length,
                },
                storageUsage: {
                    local: Object.keys(localStorage).length,
                    sync: Object.keys(syncStorage).length,
                    estimated: this.estimateStorageSize(
                        localStorage,
                        syncStorage
                    ),
                },
                privacyStatus: {
                    encryptionEnabled:
                        this.privacySettings.encryptSensitiveData,
                    trackingProtection: this.privacySettings.trackingProtection,
                    dataRetentionDays: this.privacySettings.dataRetentionDays,
                    localStorageOnly: this.privacySettings.localStorageOnly,
                },
                recentActivity: {
                    lastCleanup: localStorage.lastPrivacyCleanup || "Never",
                    lastExport: localStorage.lastDataExport || "Never",
                    dataAge: this.calculateDataAge(localStorage),
                },
            };
        } catch (error) {
            console.error("Error getting privacy dashboard:", error);
            throw error;
        }
    }

    estimateStorageSize(localStorage, syncStorage) {
        try {
            const totalData = { ...localStorage, ...syncStorage };
            const sizeBytes = JSON.stringify(totalData).length;

            if (sizeBytes < 1024) return `${sizeBytes} bytes`;
            if (sizeBytes < 1024 * 1024)
                return `${(sizeBytes / 1024).toFixed(1)} KB`;
            return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
        } catch (error) {
            return "Unknown";
        }
    }

    calculateDataAge(localStorage) {
        let oldestTimestamp = Date.now();

        // Check session history
        if (
            localStorage.sessionHistory &&
            localStorage.sessionHistory.length > 0
        ) {
            const oldest = Math.min(
                ...localStorage.sessionHistory.map(
                    (s) => s.timestamp || Date.now()
                )
            );
            oldestTimestamp = Math.min(oldestTimestamp, oldest);
        }

        // Check site stats
        if (localStorage.siteStats) {
            const timestamps = Object.values(localStorage.siteStats).map(
                (s) => s.firstVisit || Date.now()
            );
            if (timestamps.length > 0) {
                const oldest = Math.min(...timestamps);
                oldestTimestamp = Math.min(oldestTimestamp, oldest);
            }
        }

        const daysSinceOldest = Math.floor(
            (Date.now() - oldestTimestamp) / (24 * 60 * 60 * 1000)
        );
        return `${daysSinceOldest} days`;
    }
}

// Export for use in background script
if (typeof module !== "undefined" && module.exports) {
    module.exports = PrivacyManager;
}
