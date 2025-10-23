// Tracker Dashboard Script for Tab Suspend Pro
class TrackerDashboard {
    constructor() {
        this.data = null;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.updateUI();

        // Refresh data every 5 seconds
        setInterval(() => this.loadData(), 5000);
    }

    async loadData() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "tracker-get-dashboard",
            });

            if (response.success) {
                this.data = response.data;
                this.updateUI();
            }
        } catch (error) {
            console.error("Error loading tracker data:", error);
        }
    }

    setupEventListeners() {
        // Filter category toggles
        document
            .getElementById("toggle-ads")
            .addEventListener("change", (e) => {
                this.updateSettings({ blockAds: e.target.checked });
            });

        document
            .getElementById("toggle-trackers")
            .addEventListener("change", (e) => {
                this.updateSettings({ blockTrackers: e.target.checked });
            });

        document
            .getElementById("toggle-social")
            .addEventListener("change", (e) => {
                this.updateSettings({ blockSocialMedia: e.target.checked });
            });

        document
            .getElementById("toggle-crypto")
            .addEventListener("change", (e) => {
                this.updateSettings({ blockCryptoMining: e.target.checked });
            });

        document
            .getElementById("toggle-malware")
            .addEventListener("change", (e) => {
                this.updateSettings({ blockMalware: e.target.checked });
            });

        // Whitelist management
        document
            .getElementById("add-whitelist-btn")
            .addEventListener("click", () => {
                this.addWhitelistDomain();
            });

        document
            .getElementById("whitelist-input")
            .addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    this.addWhitelistDomain();
                }
            });

        // Custom filter management
        document
            .getElementById("add-filter-btn")
            .addEventListener("click", () => {
                this.addCustomFilter();
            });

        document
            .getElementById("filter-input")
            .addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    this.addCustomFilter();
                }
            });

        // Actions
        document
            .getElementById("reset-stats-btn")
            .addEventListener("click", () => {
                this.resetStats();
            });

        document
            .getElementById("export-filters-btn")
            .addEventListener("click", () => {
                this.exportFilters();
            });

        document
            .getElementById("import-filters-btn")
            .addEventListener("click", () => {
                document.getElementById("import-file-input").click();
            });

        document
            .getElementById("import-file-input")
            .addEventListener("change", (e) => {
                this.importFilters(e.target.files[0]);
            });
    }

    updateUI() {
        if (!this.data) return;

        // Update stats
        document.getElementById("total-blocked").textContent =
            this.formatNumber(this.data.totalBlocked);
        document.getElementById("session-blocked").textContent =
            this.formatNumber(this.data.sessionBlocked);
        document.getElementById("active-rules").textContent = this.formatNumber(
            this.data.activeRules
        );

        // Update status badge
        const statusEl = document.getElementById("blocker-status");
        if (this.data.enabled) {
            statusEl.innerHTML =
                '<span class="badge badge-success">Active</span>';
        } else {
            statusEl.innerHTML =
                '<span class="badge badge-danger">Disabled</span>';
        }

        // Update filter toggles
        document.getElementById("toggle-ads").checked =
            this.data.settings.blockAds;
        document.getElementById("toggle-trackers").checked =
            this.data.settings.blockTrackers;
        document.getElementById("toggle-social").checked =
            this.data.settings.blockSocialMedia;
        document.getElementById("toggle-crypto").checked =
            this.data.settings.blockCryptoMining;
        document.getElementById("toggle-malware").checked =
            this.data.settings.blockMalware;

        // Update blocked by type chart
        this.updateBlockedByTypeChart();

        // Update top blocked domains
        this.updateTopBlockedDomains();

        // Update whitelisted domains
        this.updateWhitelistedDomains();

        // Update custom filters
        this.updateCustomFilters();
    }

    updateBlockedByTypeChart() {
        const total = this.data.totalBlocked || 1; // Avoid division by zero
        const types = this.data.blockedByType;

        const updateBar = (id, value) => {
            const bar = document.getElementById(id);
            const percentage = (value / total) * 100;
            const displayPercentage = Math.min(percentage, 100); // Cap at 100%

            if (bar) {
                bar.style.width = `${displayPercentage}%`;
                bar.querySelector(".bar-value").textContent =
                    this.formatNumber(value);
            }
        };

        updateBar("bar-ads", types.ads || 0);
        updateBar("bar-trackers", types.trackers || 0);
        updateBar("bar-social", types.social || 0);
        updateBar("bar-crypto", types.crypto || 0);
        updateBar("bar-malware", types.malware || 0);
    }

    updateTopBlockedDomains() {
        const container = document.getElementById("top-blocked-domains");
        const domains = this.data.topBlockedDomains || [];

        if (domains.length === 0) {
            container.innerHTML =
                '<div class="empty-state">No blocked domains yet</div>';
            return;
        }

        container.innerHTML = domains
            .map(
                (item) => `
            <div class="list-item">
                <div class="list-item-info">
                    <div class="list-item-title">${this.escapeHtml(
                        item.domain
                    )}</div>
                    <div class="list-item-subtitle">${this.formatNumber(
                        item.count
                    )} requests blocked</div>
                </div>
            </div>
        `
            )
            .join("");
    }

    updateWhitelistedDomains() {
        const container = document.getElementById("whitelisted-domains");
        const domains = this.data.settings.whitelistedDomains || [];

        if (domains.length === 0) {
            container.innerHTML =
                '<div class="empty-state">No whitelisted domains</div>';
            return;
        }

        container.innerHTML = domains
            .map(
                (domain) => `
            <div class="list-item">
                <div class="list-item-info">
                    <div class="list-item-title">${this.escapeHtml(
                        domain
                    )}</div>
                </div>
                <button class="btn btn-danger btn-sm" data-domain="${this.escapeHtml(
                    domain
                )}" onclick="trackerDashboard.removeWhitelistDomain('${this.escapeHtml(
                    domain
                )}')">
                    Remove
                </button>
            </div>
        `
            )
            .join("");
    }

    updateCustomFilters() {
        const container = document.getElementById("custom-filters");
        const filters = this.data.settings.customFilters || [];

        if (filters.length === 0) {
            container.innerHTML =
                '<div class="empty-state">No custom filters</div>';
            return;
        }

        container.innerHTML = filters
            .map(
                (filter) => `
            <div class="list-item">
                <div class="list-item-info">
                    <div class="list-item-title"><code>${this.escapeHtml(
                        filter
                    )}</code></div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="trackerDashboard.removeCustomFilter('${this.escapeHtml(
                    filter
                )}')">
                    Remove
                </button>
            </div>
        `
            )
            .join("");
    }

    async updateSettings(settings) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "tracker-update-settings",
                settings: settings,
            });

            if (response.success) {
                await this.loadData();
                this.showNotification(
                    "Settings updated successfully",
                    "success"
                );
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            this.showNotification("Failed to update settings", "error");
        }
    }

    async addWhitelistDomain() {
        const input = document.getElementById("whitelist-input");
        const domain = input.value.trim();

        if (!domain) {
            this.showNotification("Please enter a domain", "warning");
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: "tracker-add-whitelist",
                domain: domain,
            });

            if (response.success) {
                input.value = "";
                await this.loadData();
                this.showNotification(
                    `Added ${domain} to whitelist`,
                    "success"
                );
            }
        } catch (error) {
            console.error("Error adding whitelist domain:", error);
            this.showNotification("Failed to add domain", "error");
        }
    }

    async removeWhitelistDomain(domain) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "tracker-remove-whitelist",
                domain: domain,
            });

            if (response.success) {
                await this.loadData();
                this.showNotification(
                    `Removed ${domain} from whitelist`,
                    "success"
                );
            }
        } catch (error) {
            console.error("Error removing whitelist domain:", error);
            this.showNotification("Failed to remove domain", "error");
        }
    }

    async addCustomFilter() {
        const input = document.getElementById("filter-input");
        const pattern = input.value.trim();

        if (!pattern) {
            this.showNotification("Please enter a URL pattern", "warning");
            return;
        }

        // Basic validation
        if (!pattern.includes("*://") && !pattern.startsWith("http")) {
            this.showNotification(
                "Pattern should start with *:// or http(s)://",
                "warning"
            );
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: "tracker-add-custom-filter",
                pattern: pattern,
            });

            if (response.success) {
                input.value = "";
                await this.loadData();
                this.showNotification(
                    "Custom filter added successfully",
                    "success"
                );
            }
        } catch (error) {
            console.error("Error adding custom filter:", error);
            this.showNotification("Failed to add filter", "error");
        }
    }

    async removeCustomFilter(pattern) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "tracker-remove-custom-filter",
                pattern: pattern,
            });

            if (response.success) {
                await this.loadData();
                this.showNotification("Custom filter removed", "success");
            }
        } catch (error) {
            console.error("Error removing custom filter:", error);
            this.showNotification("Failed to remove filter", "error");
        }
    }

    async resetStats() {
        if (
            !confirm(
                "Are you sure you want to reset all statistics? This action cannot be undone."
            )
        ) {
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: "tracker-reset-stats",
            });

            if (response.success) {
                await this.loadData();
                this.showNotification(
                    "Statistics reset successfully",
                    "success"
                );
            }
        } catch (error) {
            console.error("Error resetting stats:", error);
            this.showNotification("Failed to reset statistics", "error");
        }
    }

    async exportFilters() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "tracker-export-filters",
            });

            if (response.success) {
                const dataStr = JSON.stringify(response.data, null, 2);
                const dataBlob = new Blob([dataStr], {
                    type: "application/json",
                });
                const url = URL.createObjectURL(dataBlob);

                const link = document.createElement("a");
                link.href = url;
                link.download = `tracker-filters-${Date.now()}.json`;
                link.click();

                URL.revokeObjectURL(url);
                this.showNotification(
                    "Filters exported successfully",
                    "success"
                );
            }
        } catch (error) {
            console.error("Error exporting filters:", error);
            this.showNotification("Failed to export filters", "error");
        }
    }

    async importFilters(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const response = await chrome.runtime.sendMessage({
                action: "tracker-import-filters",
                data: data,
            });

            if (response.success) {
                await this.loadData();
                this.showNotification(
                    "Filters imported successfully",
                    "success"
                );
            }
        } catch (error) {
            console.error("Error importing filters:", error);
            this.showNotification(
                "Failed to import filters. Please check the file format.",
                "error"
            );
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + "M";
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + "K";
        }
        return num.toString();
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = "info") {
        // Create notification element
        const notification = document.createElement("div");
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            font-weight: 500;
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        if (type === "success") {
            notification.style.background = "#d1fae5";
            notification.style.color = "#065f46";
        } else if (type === "error") {
            notification.style.background = "#fee2e2";
            notification.style.color = "#991b1b";
        } else if (type === "warning") {
            notification.style.background = "#fed7aa";
            notification.style.color = "#92400e";
        } else {
            notification.style.background = "#dbeafe";
            notification.style.color = "#1e40af";
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = "slideOut 0.3s ease-out";
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Add animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .btn-sm {
        padding: 0.25rem 0.75rem;
        font-size: 0.75rem;
    }

    code {
        font-family: 'Courier New', monospace;
        background: #f3f4f6;
        padding: 0.125rem 0.25rem;
        border-radius: 3px;
        font-size: 0.875rem;
    }
`;
document.head.appendChild(style);

// Initialize dashboard
const trackerDashboard = new TrackerDashboard();
