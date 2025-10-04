// Enhanced Dashboard JavaScript for Tab Suspend Pro
class MainDashboard {
    constructor() {
        this.refreshInterval = null;
        this.focusModeActive = false;
        this.init();
    }

    async init() {
        await this.loadTheme();
        await this.loadQuickStats();
        await this.loadFeatures();
        await this.checkFocusMode();
        this.setupEventListeners();
        this.startAutoRefresh();
        console.log("Main Dashboard initialized");
    }

    async loadTheme() {
        try {
            const result = await chrome.storage.sync.get(["theme"]);
            const theme = result.theme || "light";
            if (theme === "dark") {
                document.body.setAttribute("data-theme", "dark");
            }
        } catch (error) {
            console.error("Error loading theme:", error);
        }
    }

    async loadQuickStats() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "dashboard-get-quick-stats",
            });

            const container = document.getElementById("quick-stats");

            if (response && response.success) {
                const stats = response.stats;
                container.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-icon">🔒</div>
                        <div class="stat-value">${
                            stats.suspendedTabs || 0
                        }</div>
                        <div class="stat-label">Suspended Today</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">💾</div>
                        <div class="stat-value">${this.formatBytes(
                            stats.memorySaved || 0
                        )}</div>
                        <div class="stat-label">Memory Saved</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📋</div>
                        <div class="stat-value">${
                            stats.activeSessions || 0
                        }</div>
                        <div class="stat-label">Active Sessions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⚡</div>
                        <div class="stat-value">${
                            stats.performanceGain || 0
                        }%</div>
                        <div class="stat-label">Performance Boost</div>
                    </div>
                `;
            } else {
                container.innerHTML =
                    '<div class="loading">Unable to load statistics</div>';
            }
        } catch (error) {
            console.error("Error loading quick stats:", error);
            document.getElementById("quick-stats").innerHTML =
                '<div class="loading">Error loading statistics</div>';
        }
    }

    async loadFeatures() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "dashboard-get-features",
            });

            const container = document.getElementById("features-grid");

            if (response && response.success) {
                const features = response.features;
                container.innerHTML = features
                    .map(
                        (feature) => `
                    <div class="feature-card">
                        <div class="status-indicator ${feature.status}"></div>
                        <div class="feature-icon">${feature.icon}</div>
                        <h4 class="feature-title">${feature.title}</h4>
                        <p class="feature-description">${feature.description}</p>
                    </div>
                `
                    )
                    .join("");
            } else {
                // Default features if no response
                container.innerHTML = `
                    <div class="feature-card">
                        <div class="status-indicator"></div>
                        <div class="feature-icon">🔒</div>
                        <h4 class="feature-title">Auto Tab Suspension</h4>
                        <p class="feature-description">Automatically suspend inactive tabs to save memory and improve performance</p>
                    </div>
                    <div class="feature-card">
                        <div class="status-indicator"></div>
                        <div class="feature-icon">📋</div>
                        <h4 class="feature-title">Session Management</h4>
                        <p class="feature-description">Save and restore tab sessions with templates for common workflows</p>
                    </div>
                    <div class="feature-card">
                        <div class="status-indicator"></div>
                        <div class="feature-icon">🎯</div>
                        <h4 class="feature-title">Focus Mode</h4>
                        <p class="feature-description">Block distracting websites and track productivity sessions</p>
                    </div>
                    <div class="feature-card">
                        <div class="status-indicator"></div>
                        <div class="feature-icon">☁️</div>
                        <h4 class="feature-title">Cloud Sync</h4>
                        <p class="feature-description">Backup and sync sessions across devices with cloud storage</p>
                    </div>
                    <div class="feature-card">
                        <div class="status-indicator"></div>
                        <div class="feature-icon">📊</div>
                        <h4 class="feature-title">Analytics</h4>
                        <p class="feature-description">Track usage patterns and productivity metrics with insights</p>
                    </div>
                    <div class="feature-card">
                        <div class="status-indicator"></div>
                        <div class="feature-icon">🔒</div>
                        <h4 class="feature-title">Privacy Protection</h4>
                        <p class="feature-description">GDPR-compliant data handling with encryption and retention policies</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Error loading features:", error);
            document.getElementById("features-grid").innerHTML =
                '<div class="loading">Error loading features</div>';
        }
    }

    async checkFocusMode() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "focus-get-status",
            });

            if (response && response.success) {
                this.focusModeActive = response.active;
                this.updateFocusButton();
            }
        } catch (error) {
            console.error("Error checking focus mode:", error);
        }
    }

    updateFocusButton() {
        const focusBtn = document.getElementById("focus-btn-text");
        if (focusBtn) {
            if (this.focusModeActive) {
                focusBtn.textContent = "🛑 Stop Focus";
            } else {
                focusBtn.textContent = "🎯 Start Focus";
            }
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.loadQuickStats();
        }, 30000); // Refresh every 30 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    setupEventListeners() {
        // Save session button
        const saveSessionBtn = document.getElementById("save-session");
        if (saveSessionBtn) {
            saveSessionBtn.addEventListener("click", async () => {
                const name = prompt(
                    "Enter session name:",
                    `Session ${new Date().toLocaleDateString()}`
                );
                if (name) {
                    try {
                        const response = await chrome.runtime.sendMessage({
                            action: "saveCompleteSession",
                            name: name,
                        });

                        if (response.success) {
                            this.showNotification(
                                "Session saved successfully!",
                                "success"
                            );
                            await this.loadQuickStats();
                        }
                    } catch (error) {
                        this.showNotification(
                            "Failed to save session",
                            "error"
                        );
                    }
                }
            });
        }

        // Focus mode toggle
        const focusModeBtn = document.getElementById("focus-mode-toggle");
        if (focusModeBtn) {
            focusModeBtn.addEventListener("click", async () => {
                try {
                    const response = await chrome.runtime.sendMessage({
                        action: this.focusModeActive
                            ? "focus-stop"
                            : "focus-start",
                    });

                    if (response.success) {
                        this.focusModeActive = !this.focusModeActive;
                        this.updateFocusButton();
                        this.showNotification(
                            this.focusModeActive
                                ? "Focus mode enabled"
                                : "Focus mode disabled",
                            "success"
                        );
                    }
                } catch (error) {
                    this.showNotification(
                        "Failed to toggle focus mode",
                        "error"
                    );
                }
            });
        }

        console.log("Dashboard event listeners setup complete");
    }

    updatePerformanceMetrics(data) {
        // Update health score
        const healthScore = document.getElementById("health-score");
        if (healthScore && data.healthScore !== undefined) {
            healthScore.textContent = `${data.healthScore}/100`;
            healthScore.className = "health-score";
            if (data.healthScore < 60) {
                healthScore.classList.add("critical");
            } else if (data.healthScore < 80) {
                healthScore.classList.add("warning");
            }
        }

        // Update metrics
        const currentMetrics = data.currentMetrics || {};
        this.updateMetric(
            "memory-usage",
            `${Math.round(currentMetrics.memoryUsagePercent || 0)}%`
        );
        this.updateMetric(
            "cpu-usage",
            `${Math.round(currentMetrics.cpuUsage || 0)}%`
        );
        this.updateMetric("tab-count", currentMetrics.tabCount || 0);
        this.updateMetric(
            "suspended-count",
            currentMetrics.suspendedTabCount || 0
        );

        // Update suspension stats
        if (data.suspensionStats) {
            this.updateMetric(
                "total-suspensions",
                data.suspensionStats.totalSuspensions || 0
            );
            this.updateMetric(
                "memory-saved",
                this.formatBytes(
                    data.suspensionStats.memorySaved * 1024 * 1024 || 0
                )
            );
        }

        // Update top memory tabs
        if (data.topMemoryTabs) {
            this.updateTopSites(data.topMemoryTabs);
        }

        // Generate activity heatmap
        if (data.memoryChart) {
            this.generateActivityHeatmap(data.memoryChart);
        }
    }

    updateActivityMetrics(data) {
        // Update productivity metrics
        if (data.productivityMetrics) {
            const metrics = data.productivityMetrics;
            this.updateMetric(
                "work-time",
                this.formatMinutes(metrics.workTime || 0)
            );
            this.updateMetric(
                "social-time",
                this.formatMinutes(metrics.socialTime || 0)
            );
            this.updateMetric(
                "productivity-score",
                `${metrics.productivityScore || 0}%`
            );
        }

        // Update focus mode status
        const focusStatus = document.getElementById("focus-mode-status");
        if (focusStatus && data.focusMode) {
            if (data.focusMode.enabled) {
                focusStatus.innerHTML =
                    '<div class="focus-mode-active">🎯 Focus Mode Active</div>';
            } else {
                focusStatus.innerHTML = "";
            }
        }

        // Update most used sites if not already updated
        if (
            data.mostUsedSites &&
            !document.querySelector("#top-sites .site-item")
        ) {
            this.updateTopSites(data.mostUsedSites);
        }

        // Generate activity heatmap
        if (data.heatmap) {
            this.generateActivityHeatmap(data.heatmap);
        }
    }

    updateMetric(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateTopSites(sites) {
        const container = document.getElementById("top-sites");
        if (!container) return;

        if (!sites || sites.length === 0) {
            container.innerHTML =
                '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No site data available</div>';
            return;
        }

        container.innerHTML = sites
            .slice(0, 8)
            .map(
                (site) => `
            <div class="site-item">
                <div class="site-info">
                    <img class="site-favicon" src="https://www.google.com/s2/favicons?domain=${
                        site.domain
                    }" 
                         onerror="this.style.display='none'" alt="">
                    <div>
                        <div class="site-domain">${site.domain}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">
                            ${
                                site.title
                                    ? site.title.substring(0, 30) + "..."
                                    : ""
                            }
                        </div>
                    </div>
                </div>
                <div class="site-stats">
                    <div>${
                        site.memoryUsage
                            ? this.formatBytes(site.memoryUsage * 1024 * 1024)
                            : site.timeSpent
                            ? this.formatMinutes(site.timeSpent)
                            : site.visits + " visits"
                    }</div>
                    <div style="font-size: 0.8rem;">${
                        site.lastAccessed
                            ? this.formatTimeAgo(site.lastAccessed)
                            : ""
                    }</div>
                </div>
            </div>
        `
            )
            .join("");
    }

    updateRecentSessions(sessions) {
        const container = document.getElementById("recent-sessions");
        if (!container) return;

        if (!sessions || sessions.length === 0) {
            container.innerHTML =
                '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No sessions found</div>';
            return;
        }

        container.innerHTML = sessions
            .map(
                (session) => `
            <div class="session-item" data-session-id="${session.id}">
                <div class="session-title">${session.name}</div>
                <div class="session-meta">
                    <span>${session.stats.totalTabs} tabs • ${
                    session.stats.totalWindows
                } windows</span>
                    <span>${this.formatTimeAgo(session.timestamp)}</span>
                </div>
            </div>
        `
            )
            .join("");

        // Add click handlers for session restoration
        container.querySelectorAll(".session-item").forEach((item) => {
            item.addEventListener("click", () => {
                const sessionId = item.dataset.sessionId;
                this.restoreSession(sessionId);
            });
        });
    }

    updateProfileSelector(profiles) {
        const selector = document.getElementById("workspace-profile");
        if (!selector) return;

        selector.innerHTML = profiles
            .map(
                (profile) =>
                    `<option value="${profile.id}">${profile.name}</option>`
            )
            .join("");

        // Get current profile and select it
        chrome.runtime
            .sendMessage({ action: "getCurrentProfile" })
            .then((response) => {
                if (response.success && response.profile) {
                    selector.value = response.profile.id;
                }
            });
    }

    generateActivityHeatmap(data) {
        const container = document.getElementById("activity-heatmap");
        if (!container) return;

        // Generate 30 days of heatmap data
        const days = [];
        const now = new Date();

        for (let i = 29; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split("T")[0];

            // Find activity data for this date
            let activity = 0;
            if (Array.isArray(data)) {
                const dayData = data.find((d) => d.date === dateStr);
                activity = dayData ? dayData.totalActivity || 0 : 0;
            }

            days.push({ date: dateStr, activity });
        }

        // Calculate activity levels
        const maxActivity = Math.max(...days.map((d) => d.activity), 1);

        container.innerHTML = days
            .map((day) => {
                const level =
                    day.activity === 0
                        ? ""
                        : day.activity / maxActivity > 0.75
                        ? "very-high"
                        : day.activity / maxActivity > 0.5
                        ? "high"
                        : day.activity / maxActivity > 0.25
                        ? "medium"
                        : "low";

                return `<div class="heatmap-day ${level}" title="${day.date}: ${day.activity} activities"></div>`;
            })
            .join("");
    }

    async restoreSession(sessionId) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "restoreSession",
                sessionId: sessionId,
                options: { newWindows: true },
            });

            if (response.success) {
                this.showNotification(
                    `Session restored: ${response.result.restoredTabs} tabs in ${response.result.restoredWindows} windows`,
                    "success"
                );
            }
        } catch (error) {
            this.showNotification("Failed to restore session", "error");
        }
    }

    formatMinutes(minutes) {
        if (minutes < 60) {
            return `${Math.round(minutes)}m`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round(minutes % 60);
        return `${hours}h ${remainingMinutes}m`;
    }

    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return "just now";
    }

    downloadData(data, filename) {
        const dataUrl =
            "data:application/json;charset=utf-8," + encodeURIComponent(data);
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

// Global functions for HTML event handlers
let dashboardInstance;

async function openPopup() {
    chrome.action.openPopup();
}

async function saveCurrentSession() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: "saveCurrentSession",
            name: `Session ${new Date().toLocaleString()}`,
        });

        if (response && response.success) {
            showNotification("Current session saved successfully!", "success");
        } else {
            showNotification("Failed to save session", "error");
        }
    } catch (error) {
        console.error("Error saving session:", error);
        showNotification("Error saving session", "error");
    }
}

async function generateReport() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: "analytics-generate-report",
        });

        if (response && response.success) {
            const blob = new Blob([response.report], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            showNotification("Analytics report generated!", "success");
        } else {
            showNotification("Failed to generate report", "error");
        }
    } catch (error) {
        console.error("Error generating report:", error);
        showNotification("Error generating report", "error");
    }
}

async function exportData() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: "privacy-export-data",
        });

        if (response && response.success) {
            const blob = new Blob([response.data], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tab-suspend-pro-data-${
                new Date().toISOString().split("T")[0]
            }.json`;
            a.click();
            URL.revokeObjectURL(url);
            showNotification("Data exported successfully!", "success");
        } else {
            showNotification("Failed to export data", "error");
        }
    } catch (error) {
        console.error("Error exporting data:", error);
        showNotification("Error exporting data", "error");
    }
}

async function setupCloudSync() {
    try {
        window.open("privacy-dashboard.html#cloud-section", "_blank");
    } catch (error) {
        console.error("Error opening cloud setup:", error);
    }
}

async function createBackup() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: "cloud-create-backup",
        });

        if (response && response.success) {
            showNotification("Backup created successfully!", "success");
        } else {
            showNotification("Failed to create backup", "error");
        }
    } catch (error) {
        console.error("Error creating backup:", error);
        showNotification("Error creating backup", "error");
    }
}

async function toggleFocusMode() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: dashboardInstance.focusModeActive
                ? "focus-stop"
                : "focus-start",
        });

        if (response && response.success) {
            dashboardInstance.focusModeActive =
                !dashboardInstance.focusModeActive;
            dashboardInstance.updateFocusButton();
            showNotification(
                dashboardInstance.focusModeActive
                    ? "Focus mode activated!"
                    : "Focus mode deactivated!",
                "success"
            );
        } else {
            showNotification("Failed to toggle focus mode", "error");
        }
    } catch (error) {
        console.error("Error toggling focus mode:", error);
        showNotification("Error toggling focus mode", "error");
    }
}

async function configureFocus() {
    window.open("options.html#focus-settings", "_blank");
}

async function resetSettings() {
    if (
        confirm(
            "Are you sure you want to reset all settings to default? This action cannot be undone."
        )
    ) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "resetAllSettings",
            });

            if (response && response.success) {
                showNotification(
                    "Settings reset to default successfully!",
                    "success"
                );
                setTimeout(() => location.reload(), 2000);
            } else {
                showNotification("Failed to reset settings", "error");
            }
        } catch (error) {
            console.error("Error resetting settings:", error);
            showNotification("Error resetting settings", "error");
        }
    }
}

function showNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        ${
            type === "success"
                ? "background: #10b981;"
                : type === "error"
                ? "background: #ef4444;"
                : "background: #3b82f6;"
        }
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    dashboardInstance = new MainDashboard();
});
