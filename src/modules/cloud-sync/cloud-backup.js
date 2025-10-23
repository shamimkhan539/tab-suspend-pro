// Cloud Backup and Sync Module for BrowserGuard Pro
class CloudBackupManager {
    constructor() {
        this.syncSettings = {
            enabled: false,
            provider: "none", // 'google-drive', 'dropbox', 'onedrive', 'none'
            autoSync: false,
            syncInterval: "daily", // 'hourly', 'daily', 'weekly'
            lastSync: null,
            encryptBackups: true,
        };
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.init();
    }

    async init() {
        await this.loadSyncSettings();
        this.setupSyncSchedule();
        this.setupNetworkListeners();
        console.log("Cloud Backup Manager initialized");
    }

    async loadSyncSettings() {
        try {
            const data = await chrome.storage.sync.get(["cloudSyncSettings"]);
            if (data.cloudSyncSettings) {
                this.syncSettings = {
                    ...this.syncSettings,
                    ...data.cloudSyncSettings,
                };
            }
        } catch (error) {
            console.error("Error loading sync settings:", error);
        }
    }

    async saveSyncSettings() {
        try {
            await chrome.storage.sync.set({
                cloudSyncSettings: this.syncSettings,
            });
        } catch (error) {
            console.error("Error saving sync settings:", error);
        }
    }

    setupSyncSchedule() {
        if (!this.syncSettings.enabled || !this.syncSettings.autoSync) {
            chrome.alarms.clear("cloud-sync");
            return;
        }

        let periodInMinutes;
        switch (this.syncSettings.syncInterval) {
            case "hourly":
                periodInMinutes = 60;
                break;
            case "daily":
                periodInMinutes = 1440;
                break;
            case "weekly":
                periodInMinutes = 10080;
                break;
            default:
                periodInMinutes = 1440;
        }

        chrome.alarms.create("cloud-sync", {
            periodInMinutes: periodInMinutes,
        });
    }

    setupNetworkListeners() {
        // Service worker compatible network detection
        this.isOnline = navigator.onLine;

        // Use chrome.runtime.connect for network status monitoring
        // Since service workers don't have window object, we'll check network status periodically
        this.networkCheckInterval = setInterval(() => {
            const wasOnline = this.isOnline;
            this.isOnline = navigator.onLine;

            if (wasOnline !== this.isOnline) {
                if (this.isOnline) {
                    console.log("Network connection restored - sync available");
                    // Trigger any pending sync operations
                    this.processPendingSyncs();
                } else {
                    console.log("Network connection lost - sync unavailable");
                }
            }
        }, 5000); // Check every 5 seconds
    }

    async processPendingSyncs() {
        // Process any pending sync operations when network comes back online
        if (
            this.isOnline &&
            this.syncSettings.enabled &&
            !this.syncInProgress
        ) {
            try {
                console.log("Processing pending syncs...");
                await this.syncAll();
            } catch (error) {
                console.error("Error processing pending syncs:", error);
            }
        }
    }

    cleanup() {
        // Clean up interval when shutting down
        if (this.networkCheckInterval) {
            clearInterval(this.networkCheckInterval);
            this.networkCheckInterval = null;
        }
    }

    // Authentication Methods
    async authenticateProvider(provider) {
        if (!this.isOnline) {
            throw new Error("No internet connection available");
        }

        try {
            let authUrl;
            switch (provider) {
                case "google-drive":
                    authUrl = await this.getGoogleDriveAuthUrl();
                    break;
                case "dropbox":
                    authUrl = await this.getDropboxAuthUrl();
                    break;
                case "onedrive":
                    authUrl = await this.getOneDriveAuthUrl();
                    break;
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }

            // Use Chrome Identity API for OAuth
            const redirectUrl = await chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true,
            });

            await this.handleAuthCallback(provider, redirectUrl);

            this.syncSettings.provider = provider;
            this.syncSettings.enabled = true;
            await this.saveSyncSettings();

            return { success: true, provider };
        } catch (error) {
            console.error(`Authentication failed for ${provider}:`, error);
            throw error;
        }
    }

    async getGoogleDriveAuthUrl() {
        // This would be replaced with actual Google Drive OAuth setup
        const clientId = "your-google-client-id";
        const redirectUri = chrome.identity.getRedirectURL();
        const scope = "https://www.googleapis.com/auth/drive.file";

        return (
            `https://accounts.google.com/oauth/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scope)}&` +
            `response_type=code`
        );
    }

    async getDropboxAuthUrl() {
        // Dropbox OAuth setup
        const clientId = "your-dropbox-app-key";
        const redirectUri = chrome.identity.getRedirectURL();

        return (
            `https://www.dropbox.com/oauth2/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code`
        );
    }

    async getOneDriveAuthUrl() {
        // Microsoft OneDrive OAuth setup
        const clientId = "your-microsoft-client-id";
        const redirectUri = chrome.identity.getRedirectURL();
        const scope = "files.readwrite";

        return (
            `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scope)}&` +
            `response_type=code`
        );
    }

    async handleAuthCallback(provider, redirectUrl) {
        const url = new URL(redirectUrl);
        const code = url.searchParams.get("code");

        if (!code) {
            throw new Error("Authentication cancelled or failed");
        }

        // Exchange code for access token
        const tokenData = await this.exchangeCodeForToken(provider, code);

        // Store tokens securely
        await chrome.storage.local.set({
            [`${provider}_token`]: tokenData,
        });

        console.log(`Successfully authenticated with ${provider}`);
    }

    async exchangeCodeForToken(provider, code) {
        // This would implement the actual token exchange for each provider
        // For now, return a mock token structure
        return {
            access_token: "mock_access_token",
            refresh_token: "mock_refresh_token",
            expires_in: 3600,
            token_type: "Bearer",
        };
    }

    // Data Backup Methods
    async createBackup() {
        if (this.syncInProgress) {
            throw new Error("Sync already in progress");
        }

        if (!this.isOnline) {
            throw new Error("No internet connection available");
        }

        this.syncInProgress = true;

        try {
            // Collect all data to backup
            const backupData = await this.collectBackupData();

            // Encrypt if enabled
            if (this.syncSettings.encryptBackups) {
                backupData.encrypted = true;
                backupData.data = await this.encryptBackupData(backupData.data);
            }

            // Upload to selected provider
            const result = await this.uploadBackup(backupData);

            this.syncSettings.lastSync = Date.now();
            await this.saveSyncSettings();

            console.log("Backup created successfully");
            return result;
        } catch (error) {
            console.error("Backup creation failed:", error);
            throw error;
        } finally {
            this.syncInProgress = false;
        }
    }

    async collectBackupData() {
        const localStorage = await chrome.storage.local.get();
        const syncStorage = await chrome.storage.sync.get();

        return {
            metadata: {
                version: "2.1.0",
                timestamp: Date.now(),
                source: "BrowserGuard Pro",
                browser: navigator.userAgent,
            },
            settings: syncStorage,
            data: {
                sessions: localStorage.sessionHistory || [],
                analytics: localStorage.activityHeatmap || {},
                siteStats: localStorage.siteStats || {},
                savedGroups: localStorage.savedTabGroups || {},
                performanceHistory: localStorage.performanceHistory || [],
                sessionTemplates: localStorage.sessionTemplates || {},
            },
        };
    }

    async encryptBackupData(data) {
        try {
            // Simple encryption using Web Crypto API
            const encoder = new TextEncoder();
            const dataString = JSON.stringify(data);
            const dataBuffer = encoder.encode(dataString);

            // Generate a key (in production, use proper key management)
            const key = await crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );

            // Generate IV
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Encrypt
            const encrypted = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                dataBuffer
            );

            // Export key for storage
            const exportedKey = await crypto.subtle.exportKey("jwk", key);

            return {
                encrypted: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv),
                key: exportedKey,
            };
        } catch (error) {
            console.error("Encryption failed:", error);
            return data; // Return unencrypted if encryption fails
        }
    }

    async uploadBackup(backupData) {
        const fileName = `tab-suspend-pro-backup-${Date.now()}.json`;

        switch (this.syncSettings.provider) {
            case "google-drive":
                return await this.uploadToGoogleDrive(fileName, backupData);
            case "dropbox":
                return await this.uploadToDropbox(fileName, backupData);
            case "onedrive":
                return await this.uploadToOneDrive(fileName, backupData);
            default:
                throw new Error(`No provider configured for backup`);
        }
    }

    async uploadToGoogleDrive(fileName, data) {
        try {
            const tokenData = await chrome.storage.local.get([
                "google-drive_token",
            ]);
            if (!tokenData["google-drive_token"]) {
                throw new Error("Google Drive not authenticated");
            }

            // Create file metadata
            const metadata = {
                name: fileName,
                parents: ["appDataFolder"], // Store in app-specific folder
            };

            // Upload file
            const formData = new FormData();
            formData.append(
                "metadata",
                new Blob([JSON.stringify(metadata)], {
                    type: "application/json",
                })
            );
            formData.append(
                "file",
                new Blob([JSON.stringify(data)], { type: "application/json" })
            );

            const response = await fetch(
                "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${tokenData["google-drive_token"].access_token}`,
                    },
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Google Drive upload failed: ${response.statusText}`
                );
            }

            const result = await response.json();
            return {
                success: true,
                fileId: result.id,
                provider: "google-drive",
            };
        } catch (error) {
            console.error("Google Drive upload failed:", error);
            throw error;
        }
    }

    async uploadToDropbox(fileName, data) {
        try {
            const tokenData = await chrome.storage.local.get(["dropbox_token"]);
            if (!tokenData["dropbox_token"]) {
                throw new Error("Dropbox not authenticated");
            }

            const response = await fetch(
                "https://content.dropboxapi.com/2/files/upload",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${tokenData["dropbox_token"].access_token}`,
                        "Content-Type": "application/octet-stream",
                        "Dropbox-API-Arg": JSON.stringify({
                            path: `/Apps/TabSuspendPro/${fileName}`,
                            mode: "add",
                            autorename: true,
                        }),
                    },
                    body: JSON.stringify(data),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Dropbox upload failed: ${response.statusText}`
                );
            }

            const result = await response.json();
            return {
                success: true,
                path: result.path_display,
                provider: "dropbox",
            };
        } catch (error) {
            console.error("Dropbox upload failed:", error);
            throw error;
        }
    }

    async uploadToOneDrive(fileName, data) {
        try {
            const tokenData = await chrome.storage.local.get([
                "onedrive_token",
            ]);
            if (!tokenData["onedrive_token"]) {
                throw new Error("OneDrive not authenticated");
            }

            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/Apps/TabSuspendPro/${fileName}:/content`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${tokenData["onedrive_token"].access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(data),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `OneDrive upload failed: ${response.statusText}`
                );
            }

            const result = await response.json();
            return { success: true, fileId: result.id, provider: "onedrive" };
        } catch (error) {
            console.error("OneDrive upload failed:", error);
            throw error;
        }
    }

    // Data Restore Methods
    async listBackups() {
        if (!this.isOnline) {
            throw new Error("No internet connection available");
        }

        switch (this.syncSettings.provider) {
            case "google-drive":
                return await this.listGoogleDriveBackups();
            case "dropbox":
                return await this.listDropboxBackups();
            case "onedrive":
                return await this.listOneDriveBackups();
            default:
                throw new Error(`No provider configured`);
        }
    }

    async restoreBackup(backupId) {
        if (!this.isOnline) {
            throw new Error("No internet connection available");
        }

        try {
            // Download backup
            const backupData = await this.downloadBackup(backupId);

            // Decrypt if needed
            if (backupData.encrypted) {
                backupData.data = await this.decryptBackupData(backupData.data);
            }

            // Restore data
            await this.restoreBackupData(backupData);

            console.log("Backup restored successfully");
            return { success: true };
        } catch (error) {
            console.error("Backup restore failed:", error);
            throw error;
        }
    }

    async downloadBackup(backupId) {
        switch (this.syncSettings.provider) {
            case "google-drive":
                return await this.downloadFromGoogleDrive(backupId);
            case "dropbox":
                return await this.downloadFromDropbox(backupId);
            case "onedrive":
                return await this.downloadFromOneDrive(backupId);
            default:
                throw new Error(`No provider configured`);
        }
    }

    async restoreBackupData(backupData) {
        const { settings, data } = backupData;

        // Restore settings
        if (settings) {
            await chrome.storage.sync.set(settings);
        }

        // Restore data
        if (data) {
            await chrome.storage.local.set({
                sessionHistory: data.sessions || [],
                activityHeatmap: data.analytics || {},
                siteStats: data.siteStats || {},
                savedTabGroups: data.savedGroups || {},
                performanceHistory: data.performanceHistory || [],
                sessionTemplates: data.sessionTemplates || {},
            });
        }
    }

    // Sync Status Methods
    getSyncStatus() {
        return {
            enabled: this.syncSettings.enabled,
            provider: this.syncSettings.provider,
            lastSync: this.syncSettings.lastSync,
            autoSync: this.syncSettings.autoSync,
            syncInterval: this.syncSettings.syncInterval,
            isOnline: this.isOnline,
            syncInProgress: this.syncInProgress,
        };
    }

    async performScheduledSync() {
        if (!this.syncSettings.enabled || !this.syncSettings.autoSync) {
            return;
        }

        try {
            await this.createBackup();
            console.log("Scheduled sync completed successfully");
        } catch (error) {
            console.error("Scheduled sync failed:", error);
        }
    }

    // Configuration Methods
    async configurePovider(provider, settings = {}) {
        this.syncSettings.provider = provider;
        this.syncSettings.enabled = true;
        this.syncSettings = { ...this.syncSettings, ...settings };

        await this.saveSyncSettings();
        this.setupSyncSchedule();
    }

    async disableSync() {
        this.syncSettings.enabled = false;
        this.syncSettings.autoSync = false;

        await this.saveSyncSettings();
        chrome.alarms.clear("cloud-sync");
    }
}

// Export for use in background script
if (typeof module !== "undefined" && module.exports) {
    module.exports = CloudBackupManager;
}
