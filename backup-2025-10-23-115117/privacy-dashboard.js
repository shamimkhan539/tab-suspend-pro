// Privacy Dashboard JavaScript
class PrivacyDashboard {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadDataOverview();
        await this.loadPrivacyStatus();
        await this.loadStorageUsage();
        await this.loadCloudBackup();
        await this.loadPrivacySettings();
        await this.loadCloudProviders();
        this.setupEventListeners();
    }

    async loadDataOverview() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "privacy-get-data-overview",
            });

            const container = document.getElementById("data-overview");

            if (response && response.success) {
                const data = response.data;
                container.innerHTML = `
                    <div class="metric-row">
                        <span class="metric-label">Sessions Stored</span>
                        <span class="metric-value">${
                            data.sessionsCount || 0
                        }</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Templates Created</span>
                        <span class="metric-value">${
                            data.templatesCount || 0
                        }</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Suspended Tabs</span>
                        <span class="metric-value">${
                            data.suspendedTabsCount || 0
                        }</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Total Data Size</span>
                        <span class="metric-value">${this.formatBytes(
                            data.totalSize || 0
                        )}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Last Cleanup</span>
                        <span class="metric-value">${this.formatDate(
                            data.lastCleanup
                        )}</span>
                    </div>
                `;
            } else {
                container.innerHTML =
                    '<div class="alert alert-warning">Unable to load data overview</div>';
            }
        } catch (error) {
            console.error("Error loading data overview:", error);
            document.getElementById("data-overview").innerHTML =
                '<div class="alert alert-danger">Error loading data overview</div>';
        }
    }

    async loadPrivacyStatus() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "privacy-get-status",
            });

            const container = document.getElementById("privacy-status");

            if (response && response.success) {
                const status = response.status;
                container.innerHTML = `
                    <div class="metric-row">
                        <span class="metric-label">Data Retention</span>
                        <span class="status-indicator ${
                            status.dataRetention
                                ? "status-enabled"
                                : "status-disabled"
                        }">
                            ${status.dataRetention ? "✓ Active" : "✗ Disabled"}
                        </span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Encryption</span>
                        <span class="status-indicator ${
                            status.encryption
                                ? "status-enabled"
                                : "status-disabled"
                        }">
                            ${status.encryption ? "✓ Enabled" : "✗ Disabled"}
                        </span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Auto Cleanup</span>
                        <span class="status-indicator ${
                            status.autoCleanup
                                ? "status-enabled"
                                : "status-disabled"
                        }">
                            ${status.autoCleanup ? "✓ Active" : "✗ Disabled"}
                        </span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Analytics</span>
                        <span class="status-indicator ${
                            status.analytics
                                ? "status-enabled"
                                : "status-disabled"
                        }">
                            ${status.analytics ? "✓ Enabled" : "✗ Disabled"}
                        </span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">GDPR Compliance</span>
                        <span class="status-indicator status-enabled">✓ Compliant</span>
                    </div>
                `;
            } else {
                container.innerHTML =
                    '<div class="alert alert-warning">Unable to load privacy status</div>';
            }
        } catch (error) {
            console.error("Error loading privacy status:", error);
            document.getElementById("privacy-status").innerHTML =
                '<div class="alert alert-danger">Error loading privacy status</div>';
        }
    }

    async loadStorageUsage() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "privacy-get-storage-usage",
            });

            const container = document.getElementById("storage-usage");

            if (response && response.success) {
                const usage = response.usage;
                const totalQuota = 10 * 1024 * 1024; // 10MB quota for extensions
                const usagePercent = (
                    (usage.totalBytes / totalQuota) *
                    100
                ).toFixed(1);

                container.innerHTML = `
                    <div class="metric-row">
                        <span class="metric-label">Local Storage</span>
                        <span class="metric-value">${this.formatBytes(
                            usage.localStorage || 0
                        )}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Sync Storage</span>
                        <span class="metric-value">${this.formatBytes(
                            usage.syncStorage || 0
                        )}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Total Used</span>
                        <span class="metric-value">${this.formatBytes(
                            usage.totalBytes || 0
                        )}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Quota Usage</span>
                        <span class="status-indicator ${
                            usagePercent > 80
                                ? "status-warning"
                                : "status-enabled"
                        }">
                            ${usagePercent}%
                        </span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Last Updated</span>
                        <span class="metric-value">${this.formatDate(
                            usage.lastUpdated
                        )}</span>
                    </div>
                `;
            } else {
                container.innerHTML =
                    '<div class="alert alert-warning">Unable to load storage usage</div>';
            }
        } catch (error) {
            console.error("Error loading storage usage:", error);
            document.getElementById("storage-usage").innerHTML =
                '<div class="alert alert-danger">Error loading storage usage</div>';
        }
    }

    async loadPrivacySettings() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "privacy-get-settings",
            });

            const container = document.getElementById("privacy-settings");

            if (response && response.success) {
                const settings = response.settings;
                container.innerHTML = `
                    <div class="privacy-setting">
                        <div class="setting-info">
                            <h4>Data Retention Policy</h4>
                            <p>Automatically delete old sessions and analytics data</p>
                        </div>
                        <div class="toggle ${
                            settings.dataRetention ? "active" : ""
                        }" 
                             data-setting="dataRetention"></div>
                    </div>
                    <div class="privacy-setting">
                        <div class="setting-info">
                            <h4>Local Encryption</h4>
                            <p>Encrypt stored data using AES-256 encryption</p>
                        </div>
                        <div class="toggle ${
                            settings.encryption ? "active" : ""
                        }" 
                             data-setting="encryption"></div>
                    </div>
                    <div class="privacy-setting">
                        <div class="setting-info">
                            <h4>Anonymous Analytics</h4>
                            <p>Help improve the extension with usage analytics</p>
                        </div>
                        <div class="toggle ${
                            settings.analytics ? "active" : ""
                        }" 
                             data-setting="analytics"></div>
                    </div>
                    <div class="privacy-setting">
                        <div class="setting-info">
                            <h4>Auto Data Cleanup</h4>
                            <p>Regularly clean up temporary and cached data</p>
                        </div>
                        <div class="toggle ${
                            settings.autoCleanup ? "active" : ""
                        }" 
                             data-setting="autoCleanup"></div>
                    </div>
                    <div class="privacy-setting">
                        <div class="setting-info">
                            <h4>Share Data with Cloud</h4>
                            <p>Allow backup and sync features to access your data</p>
                        </div>
                        <div class="toggle ${
                            settings.cloudSharing ? "active" : ""
                        }" 
                             data-setting="cloudSharing"></div>
                    </div>
                `;

                // Add event listeners for toggles
                container.querySelectorAll(".toggle").forEach((toggle) => {
                    toggle.addEventListener("click", () =>
                        this.togglePrivacySetting(toggle)
                    );
                });
            } else {
                container.innerHTML =
                    '<div class="alert alert-warning">Unable to load privacy settings</div>';
            }
        } catch (error) {
            console.error("Error loading privacy settings:", error);
            document.getElementById("privacy-settings").innerHTML =
                '<div class="alert alert-danger">Error loading privacy settings</div>';
        }
    }

    async loadCloudProviders() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "cloud-get-providers",
            });

            const container = document.getElementById("cloud-providers");

            if (response && response.success) {
                const providers = response.providers;
                container.innerHTML = providers
                    .map(
                        (provider) => `
                    <div class="cloud-provider ${
                        provider.connected ? "active" : ""
                    }" 
                         data-provider="${provider.id}">
                        <div class="provider-icon">${provider.icon}</div>
                        <div class="provider-info">
                            <h4>${provider.name}</h4>
                            <p>${
                                provider.connected
                                    ? "Connected"
                                    : "Not connected"
                            } • ${provider.description}</p>
                        </div>
                        <div class="status-indicator ${
                            provider.connected
                                ? "status-enabled"
                                : "status-disabled"
                        }">
                            ${provider.connected ? "✓" : "○"}
                        </div>
                    </div>
                `
                    )
                    .join("");

                // Add event listeners for provider selection
                container
                    .querySelectorAll(".cloud-provider")
                    .forEach((provider) => {
                        provider.addEventListener("click", () =>
                            this.toggleCloudProvider(provider)
                        );
                    });
            } else {
                container.innerHTML =
                    '<div class="alert alert-warning">Unable to load cloud providers</div>';
            }
        } catch (error) {
            console.error("Error loading cloud providers:", error);
            document.getElementById("cloud-providers").innerHTML =
                '<div class="alert alert-danger">Error loading cloud providers</div>';
        }
    }

    setupEventListeners() {
        // Export data button
        document.getElementById("export-data").addEventListener("click", () => {
            this.exportData();
        });

        // Privacy report button
        document
            .getElementById("privacy-report")
            .addEventListener("click", () => {
                this.generatePrivacyReport();
            });

        // Create backup button
        document
            .getElementById("create-backup")
            .addEventListener("click", () => {
                this.createBackup();
            });

        // Clear data button
        document.getElementById("clear-data").addEventListener("click", () => {
            this.clearAllData();
        });
    }

    async togglePrivacySetting(toggle) {
        const setting = toggle.dataset.setting;
        const isActive = toggle.classList.contains("active");
        const newValue = !isActive;

        try {
            const response = await chrome.runtime.sendMessage({
                action: "privacy-update-setting",
                setting: setting,
                value: newValue,
            });

            if (response && response.success) {
                toggle.classList.toggle("active", newValue);
                this.showNotification(
                    `Privacy setting updated: ${setting}`,
                    "success"
                );
            } else {
                this.showNotification(
                    "Failed to update privacy setting",
                    "error"
                );
            }
        } catch (error) {
            console.error("Error updating privacy setting:", error);
            this.showNotification("Error updating privacy setting", "error");
        }
    }

    async toggleCloudProvider(providerElement) {
        const providerId = providerElement.dataset.provider;
        const isConnected = providerElement.classList.contains("active");

        try {
            const response = await chrome.runtime.sendMessage({
                action: isConnected
                    ? "cloud-disconnect-provider"
                    : "cloud-connect-provider",
                provider: providerId,
            });

            if (response && response.success) {
                providerElement.classList.toggle("active", !isConnected);
                const statusIndicator =
                    providerElement.querySelector(".status-indicator");
                const providerInfo =
                    providerElement.querySelector(".provider-info p");

                if (!isConnected) {
                    statusIndicator.textContent = "✓";
                    statusIndicator.className =
                        "status-indicator status-enabled";
                    providerInfo.textContent = providerInfo.textContent.replace(
                        "Not connected",
                        "Connected"
                    );
                } else {
                    statusIndicator.textContent = "○";
                    statusIndicator.className =
                        "status-indicator status-disabled";
                    providerInfo.textContent = providerInfo.textContent.replace(
                        "Connected",
                        "Not connected"
                    );
                }

                this.showNotification(
                    `Cloud provider ${
                        isConnected ? "disconnected" : "connected"
                    }`,
                    "success"
                );
            } else {
                this.showNotification(
                    "Failed to update cloud provider",
                    "error"
                );
            }
        } catch (error) {
            console.error("Error updating cloud provider:", error);
            this.showNotification("Error updating cloud provider", "error");
        }
    }

    async exportData() {
        try {
            this.showNotification("Exporting data...", "info");

            const response = await chrome.runtime.sendMessage({
                action: "privacy-export-data",
            });

            if (response && response.success && response.data) {
                const blob = new Blob([response.data], {
                    type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `tab-suspend-pro-data-${
                    new Date().toISOString().split("T")[0]
                }.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showNotification("Data exported successfully", "success");
            } else {
                this.showNotification("Failed to export data", "error");
            }
        } catch (error) {
            console.error("Error exporting data:", error);
            this.showNotification("Error exporting data", "error");
        }
    }

    async generatePrivacyReport() {
        try {
            this.showNotification("Generating privacy report...", "info");

            const response = await chrome.runtime.sendMessage({
                action: "privacy-generate-report",
            });

            if (response && response.success && response.report) {
                const blob = new Blob([response.report], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank");

                this.showNotification(
                    "Privacy report generated successfully",
                    "success"
                );
            } else {
                this.showNotification(
                    "Failed to generate privacy report",
                    "error"
                );
            }
        } catch (error) {
            console.error("Error generating privacy report:", error);
            this.showNotification("Error generating privacy report", "error");
        }
    }

    async createBackup() {
        try {
            this.showNotification("Creating backup...", "info");

            const response = await chrome.runtime.sendMessage({
                action: "cloud-create-backup",
            });

            if (response && response.success) {
                this.showNotification("Backup created successfully", "success");
                // Refresh the cloud backup section
                await this.loadCloudBackup();
            } else {
                this.showNotification("Failed to create backup", "error");
            }
        } catch (error) {
            console.error("Error creating backup:", error);
            this.showNotification("Error creating backup", "error");
        }
    }

    async clearAllData() {
        if (
            !confirm(
                "⚠️ This will permanently delete ALL your data including sessions, templates, and settings. This action cannot be undone.\n\nAre you sure you want to continue?"
            )
        ) {
            return;
        }

        if (
            !confirm(
                'This is your FINAL warning. All data will be permanently deleted. Type "DELETE" in the next prompt to confirm.'
            )
        ) {
            return;
        }

        const confirmation = prompt(
            'Type "DELETE" to confirm permanent data deletion:'
        );
        if (confirmation !== "DELETE") {
            this.showNotification("Data deletion cancelled", "info");
            return;
        }

        try {
            this.showNotification("Clearing all data...", "info");

            const response = await chrome.runtime.sendMessage({
                action: "privacy-clear-all-data",
            });

            if (response && response.success) {
                this.showNotification(
                    "All data cleared successfully",
                    "success"
                );
                // Refresh all sections
                setTimeout(() => {
                    this.init();
                }, 1000);
            } else {
                this.showNotification("Failed to clear data", "error");
            }
        } catch (error) {
            console.error("Error clearing data:", error);
            this.showNotification("Error clearing data", "error");
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    formatDate(dateString) {
        if (!dateString) return "Never";
        const date = new Date(dateString);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    }

    showNotification(message, type) {
        // Create a simple notification system
        const notification = document.createElement("div");
        notification.className = `alert alert-${
            type === "error"
                ? "danger"
                : type === "info"
                ? "warning"
                : "success"
        }`;
        notification.textContent = message;
        notification.style.position = "fixed";
        notification.style.top = "20px";
        notification.style.right = "20px";
        notification.style.zIndex = "1000";
        notification.style.maxWidth = "300px";

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize the privacy dashboard when the page loads
document.addEventListener("DOMContentLoaded", () => {
    new PrivacyDashboard();
});
