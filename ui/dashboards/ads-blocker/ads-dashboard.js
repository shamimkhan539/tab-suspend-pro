// Ads Blocker Dashboard Script
class AdsDashboard {
    constructor() {
        this.data = null;
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.updateUI();
            this.startAutoRefresh();
        } catch (error) {
            console.error("Error initializing ads dashboard:", error);
        }
    }

    async loadData() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "get-ads-blocker-data",
            });
            this.data = response;
            console.log("Ads blocker data loaded:", this.data);
        } catch (error) {
            console.error("Error loading ads blocker data:", error);
            this.data = {
                settings: {},
                stats: {
                    totalBlocked: 0,
                    sessionBlocked: 0,
                    blockedByType: {},
                    dataBlockedMB: 0,
                },
                topBlockedDomains: [],
            };
        }
    }

    setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById("close-btn");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => window.close());
        }

        // Tabs
        document.querySelectorAll(".tab-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => this.switchTab(e.target));
        });

        // Toggle switch for blocking
        const blockingToggle = document.getElementById("ads-blocker-toggle");
        if (blockingToggle) {
            blockingToggle.addEventListener("change", () =>
                this.toggleBlocking(blockingToggle.checked)
            );
        }

        // Setting toggles
        document.querySelectorAll(".setting-toggle").forEach((toggle) => {
            toggle.addEventListener("change", () =>
                this.handleSettingChange(toggle)
            );
        });

        // Whitelist
        const addWhitelistBtn = document.getElementById("add-whitelist-btn");
        if (addWhitelistBtn) {
            addWhitelistBtn.addEventListener("click", () =>
                this.addToWhitelist()
            );
        }

        // Custom Filters
        const addFilterBtn = document.getElementById("add-filter-btn");
        if (addFilterBtn) {
            addFilterBtn.addEventListener("click", () =>
                this.addCustomFilter()
            );
        }

        // Action buttons
        const resetStatsBtn = document.getElementById("reset-stats-btn");
        if (resetStatsBtn) {
            resetStatsBtn.addEventListener("click", () => this.resetStats());
        }

        const exportStatsBtn = document.getElementById("export-stats-btn");
        if (exportStatsBtn) {
            exportStatsBtn.addEventListener("click", () => this.exportStats());
        }

        const exportFiltersBtn = document.getElementById("export-filters-btn");
        if (exportFiltersBtn) {
            exportFiltersBtn.addEventListener("click", () =>
                this.exportFilters()
            );
        }

        const importFiltersBtn = document.getElementById("import-filters-btn");
        if (importFiltersBtn) {
            importFiltersBtn.addEventListener("click", () =>
                this.importFilters()
            );
        }
    }

    switchTab(tabBtn) {
        // Remove active class from all buttons and content
        document.querySelectorAll(".tab-btn").forEach((btn) => {
            btn.classList.remove("active");
        });
        document.querySelectorAll(".tab-content").forEach((content) => {
            content.classList.remove("active");
        });

        // Add active class to clicked button and corresponding content
        tabBtn.classList.add("active");
        const tabId = tabBtn.dataset.tab;
        const tabContent = document.getElementById(tabId);
        if (tabContent) {
            tabContent.classList.add("active");
        }
    }

    updateUI() {
        if (!this.data) return;

        const { settings, stats, topBlockedDomains } = this.data;

        // Update status
        const statusValue = document.getElementById("status-value");
        const statusIndicator = document.getElementById("status-indicator");
        if (statusValue && statusIndicator) {
            if (settings.enabled) {
                statusValue.textContent = "Active";
                statusIndicator.style.background = "#10b981";
            } else {
                statusValue.textContent = "Inactive";
                statusIndicator.style.background = "#ef4444";
            }
        }

        // Update toggle state
        const blockingToggle = document.getElementById("ads-blocker-toggle");
        if (blockingToggle) {
            blockingToggle.checked = settings.enabled || false;
        }

        // Update stats
        document.getElementById("total-blocked").textContent =
            this.formatNumber(stats.totalBlocked || 0);
        document.getElementById("session-blocked").textContent =
            this.formatNumber(stats.sessionBlocked || 0);
        document.getElementById("data-saved").textContent =
            (stats.dataBlockedMB || 0).toFixed(1) + " MB";

        // Update metrics
        const blockedByType = stats.blockedByType || {};
        document.getElementById("metric-ads").textContent = this.formatNumber(
            blockedByType.ads || 0
        );
        document.getElementById("metric-analytics").textContent =
            this.formatNumber(blockedByType.analytics || 0);
        document.getElementById("metric-banners").textContent =
            this.formatNumber(blockedByType.banners || 0);
        document.getElementById("metric-cookies").textContent =
            this.formatNumber(blockedByType.cookies || 0);

        // Update top blocked domains
        this.updateTopDomains(topBlockedDomains || []);

        // Update settings toggles
        this.updateSettingToggles(settings);

        // Update whitelist
        this.updateWhitelistDisplay(settings.whitelistedDomains || []);

        // Update custom filters
        this.updateCustomFiltersDisplay(settings.customFilters || []);

        // Update last update time
        const lastUpdate = document.getElementById("last-update");
        if (lastUpdate) {
            lastUpdate.textContent = "Just now";
        }
    }

    updateTopDomains(domains) {
        const domainsList = document.getElementById("top-domains");
        if (!domainsList) return;

        if (domains.length === 0) {
            domainsList.innerHTML =
                '<div class="empty-state"><p>No ads blocked yet. Start browsing to see statistics.</p></div>';
            return;
        }

        domainsList.innerHTML = domains
            .map(
                (item) => `
            <div class="domain-item">
                <span class="domain-name">${this.escapeHtml(item.domain)}</span>
                <span class="domain-count">${this.formatNumber(
                    item.count
                )}</span>
            </div>
        `
            )
            .join("");
    }

    updateSettingToggles(settings) {
        document.querySelectorAll(".setting-toggle").forEach((toggle) => {
            const setting = toggle.dataset.setting;
            if (setting in settings) {
                toggle.checked = settings[setting] || false;
            }
        });
    }

    updateWhitelistDisplay(domains) {
        const whitelistItems = document.getElementById("whitelist-items");
        if (!whitelistItems) return;

        if (domains.length === 0) {
            whitelistItems.innerHTML =
                '<div class="empty-state"><p>No domains whitelisted. Ads will be blocked everywhere.</p></div>';
            return;
        }

        whitelistItems.innerHTML = domains
            .map(
                (domain, index) => `
            <div class="list-item">
                <span class="item-text">${this.escapeHtml(domain)}</span>
                <button class="btn-remove" data-index="${index}">Remove</button>
            </div>
        `
            )
            .join("");

        // Add event listeners to remove buttons
        whitelistItems.querySelectorAll(".btn-remove").forEach((btn) => {
            btn.addEventListener("click", () => {
                const index = parseInt(btn.dataset.index);
                this.removeFromWhitelist(index);
            });
        });
    }

    updateCustomFiltersDisplay(filters) {
        const filtersList = document.getElementById("custom-filters");
        if (!filtersList) return;

        if (filters.length === 0) {
            filtersList.innerHTML =
                '<div class="empty-state"><p>No custom filters added yet.</p></div>';
            return;
        }

        filtersList.innerHTML = filters
            .map(
                (filter, index) => `
            <div class="list-item">
                <span class="item-text" title="${this.escapeHtml(
                    filter
                )}">${this.escapeHtml(filter)}</span>
                <button class="btn-remove" data-index="${index}">Remove</button>
            </div>
        `
            )
            .join("");

        // Add event listeners to remove buttons
        filtersList.querySelectorAll(".btn-remove").forEach((btn) => {
            btn.addEventListener("click", () => {
                const index = parseInt(btn.dataset.index);
                this.removeCustomFilter(index);
            });
        });
    }

    async toggleBlocking(enabled) {
        try {
            await chrome.runtime.sendMessage({
                action: "toggle-ads-blocker",
                enabled: enabled,
            });
            this.data.settings.enabled = enabled;
            this.updateUI();
        } catch (error) {
            console.error("Error toggling ads blocker:", error);
        }
    }

    async handleSettingChange(toggle) {
        try {
            const setting = toggle.dataset.setting;
            const enabled = toggle.checked;
            const newSettings = {
                [setting]: enabled,
            };

            await chrome.runtime.sendMessage({
                action: "update-ads-blocker-settings",
                settings: newSettings,
            });

            this.data.settings[setting] = enabled;
            this.updateUI();
        } catch (error) {
            console.error("Error updating setting:", error);
        }
    }

    async addToWhitelist() {
        const input = document.getElementById("domain-input");
        if (!input || !input.value.trim()) {
            alert("Please enter a domain");
            return;
        }

        const domain = input.value.trim().toLowerCase();
        try {
            await chrome.runtime.sendMessage({
                action: "add-ads-whitelist",
                domain: domain,
            });

            input.value = "";
            await this.loadData();
            this.updateUI();
            this.showNotification("Domain added to whitelist");
        } catch (error) {
            console.error("Error adding to whitelist:", error);
        }
    }

    async removeFromWhitelist(index) {
        if (!this.data.settings.whitelistedDomains[index]) return;

        const domain = this.data.settings.whitelistedDomains[index];
        try {
            await chrome.runtime.sendMessage({
                action: "remove-ads-whitelist",
                domain: domain,
            });

            await this.loadData();
            this.updateUI();
            this.showNotification("Domain removed from whitelist");
        } catch (error) {
            console.error("Error removing from whitelist:", error);
        }
    }

    async addCustomFilter() {
        const input = document.getElementById("filter-input");
        if (!input || !input.value.trim()) {
            alert("Please enter a filter pattern");
            return;
        }

        const pattern = input.value.trim();
        try {
            await chrome.runtime.sendMessage({
                action: "add-ads-custom-filter",
                pattern: pattern,
            });

            input.value = "";
            await this.loadData();
            this.updateUI();
            this.showNotification("Custom filter added");
        } catch (error) {
            console.error("Error adding custom filter:", error);
        }
    }

    async removeCustomFilter(index) {
        if (!this.data.settings.customFilters[index]) return;

        const pattern = this.data.settings.customFilters[index];
        try {
            await chrome.runtime.sendMessage({
                action: "remove-ads-custom-filter",
                pattern: pattern,
            });

            await this.loadData();
            this.updateUI();
            this.showNotification("Custom filter removed");
        } catch (error) {
            console.error("Error removing custom filter:", error);
        }
    }

    async resetStats() {
        if (!confirm("Are you sure you want to reset all statistics?")) return;

        try {
            await chrome.runtime.sendMessage({
                action: "reset-ads-stats",
            });

            await this.loadData();
            this.updateUI();
            this.showNotification("Statistics reset");
        } catch (error) {
            console.error("Error resetting stats:", error);
        }
    }

    exportStats() {
        const stats = this.data.stats;
        const dataStr = JSON.stringify(stats, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ads-blocker-stats-${new Date().toISOString()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    async exportFilters() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "export-ads-filters",
            });

            const dataStr = JSON.stringify(response, null, 2);
            const dataBlob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `ads-filters-backup-${new Date().toISOString()}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting filters:", error);
        }
    }

    async importFilters() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";

        input.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                await chrome.runtime.sendMessage({
                    action: "import-ads-filters",
                    data: data,
                });

                await this.loadData();
                this.updateUI();
                this.showNotification("Filters imported successfully");
            } catch (error) {
                console.error("Error importing filters:", error);
                alert("Error importing filters. Please check the file format.");
            }
        });

        input.click();
    }

    startAutoRefresh() {
        // Refresh data every 5 seconds
        setInterval(async () => {
            await this.loadData();
            this.updateUI();
        }, 5000);
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(1) + "K";
        return num.toString();
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message) {
        // Create a simple notification
        const notification = document.createElement("div");
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = "slideOut 0.3s ease-out";
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    new AdsDashboard();
});
