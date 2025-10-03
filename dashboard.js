// Dashboard JavaScript for Tab Suspend Pro Analytics
class AnalyticsDashboard {
    constructor() {
        this.refreshInterval = null;
        this.init();
    }

    async init() {
        await this.loadTheme();
        await this.loadDashboardData();
        this.setupEventListeners();
        this.startAutoRefresh();
        console.log("Analytics Dashboard initialized");
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

    async loadDashboardData() {
        try {
            // Load performance analytics
            const performanceResponse = await chrome.runtime.sendMessage({
                action: "getPerformanceDashboard",
            });

            if (performanceResponse.success) {
                this.updatePerformanceMetrics(performanceResponse.data);
            }

            // Load activity analytics
            const activityResponse = await chrome.runtime.sendMessage({
                action: "getActivityDashboard",
            });

            if (activityResponse.success) {
                this.updateActivityMetrics(activityResponse.data);
            }

            // Load sessions
            const sessionsResponse = await chrome.runtime.sendMessage({
                action: "getSessions",
                limit: 5,
            });

            if (sessionsResponse.success) {
                this.updateRecentSessions(sessionsResponse.sessions);
            }

            // Load profiles
            const profilesResponse = await chrome.runtime.sendMessage({
                action: "getProfiles",
            });

            if (profilesResponse.success) {
                this.updateProfileSelector(profilesResponse.profiles);
            }
        } catch (error) {
            console.error("Error loading dashboard data:", error);
            this.showError("Failed to load dashboard data");
        }
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
                            this.showSuccess("Session saved successfully!");
                            await this.loadDashboardData();
                        }
                    } catch (error) {
                        this.showError("Failed to save session");
                    }
                }
            });
        }

        // Profile selector
        const profileSelector = document.getElementById("workspace-profile");
        if (profileSelector) {
            profileSelector.addEventListener("change", async (e) => {
                try {
                    const response = await chrome.runtime.sendMessage({
                        action: "switchProfile",
                        profileId: e.target.value,
                    });

                    if (response.success) {
                        this.showSuccess(
                            `Switched to ${response.profile.name} profile`
                        );
                    }
                } catch (error) {
                    this.showError("Failed to switch profile");
                }
            });
        }

        // Group by domain button
        const groupByDomainBtn = document.getElementById("group-by-domain");
        if (groupByDomainBtn) {
            groupByDomainBtn.addEventListener("click", async () => {
                try {
                    await chrome.runtime.sendMessage({
                        action: "groupByTimeOpened",
                    });
                    this.showSuccess("Tabs grouped by domain");
                } catch (error) {
                    this.showError("Failed to group tabs");
                }
            });
        }

        // Focus mode toggle
        const focusModeBtn = document.getElementById("focus-mode-toggle");
        if (focusModeBtn) {
            focusModeBtn.addEventListener("click", async () => {
                try {
                    // Check current focus mode status first
                    const activityResponse = await chrome.runtime.sendMessage({
                        action: "getActivityDashboard",
                    });

                    const isEnabled =
                        activityResponse.success &&
                        activityResponse.data.focusMode.enabled;

                    const response = await chrome.runtime.sendMessage({
                        action: isEnabled
                            ? "disableFocusMode"
                            : "enableFocusMode",
                        options: {},
                    });

                    if (response.success) {
                        this.showSuccess(
                            isEnabled
                                ? "Focus mode disabled"
                                : "Focus mode enabled"
                        );
                        await this.loadDashboardData();
                    }
                } catch (error) {
                    this.showError("Failed to toggle focus mode");
                }
            });
        }

        // Export data button
        const exportBtn = document.getElementById("export-data");
        if (exportBtn) {
            exportBtn.addEventListener("click", async () => {
                try {
                    const response = await chrome.runtime.sendMessage({
                        action: "exportAnalytics",
                    });

                    if (response.success) {
                        this.downloadData(
                            response.data,
                            "tab-suspend-pro-analytics.json"
                        );
                        this.showSuccess("Analytics data exported");
                    }
                } catch (error) {
                    this.showError("Failed to export data");
                }
            });
        }

        // Optimize performance button
        const optimizeBtn = document.getElementById("optimize-performance");
        if (optimizeBtn) {
            optimizeBtn.addEventListener("click", async () => {
                try {
                    // Get current tabs and suggest suspensions
                    const response = await chrome.runtime.sendMessage({
                        action: "suggestTabs",
                    });

                    if (response.success) {
                        this.showSuccess(
                            "Performance optimization suggestions sent"
                        );
                    }
                } catch (error) {
                    this.showError("Failed to optimize performance");
                }
            });
        }

        // Open options button
        const optionsBtn = document.getElementById("open-options");
        if (optionsBtn) {
            optionsBtn.addEventListener("click", () => {
                chrome.tabs.create({
                    url: chrome.runtime.getURL("options.html"),
                });
            });
        }
    }

    async restoreSession(sessionId) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "restoreSession",
                sessionId: sessionId,
                options: { newWindows: true },
            });

            if (response.success) {
                this.showSuccess(
                    `Session restored: ${response.result.restoredTabs} tabs in ${response.result.restoredWindows} windows`
                );
            }
        } catch (error) {
            this.showError("Failed to restore session");
        }
    }

    startAutoRefresh() {
        // Refresh dashboard every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Utility methods
    formatBytes(bytes) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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

    showSuccess(message) {
        this.showNotification(message, "success");
    }

    showError(message) {
        this.showNotification(message, "error");
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement("div");
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${
                type === "success"
                    ? "var(--success-color)"
                    : "var(--danger-color)"
            };
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = "slideOut 0.3s ease-in forwards";
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
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
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    new AnalyticsDashboard();
});

// Clean up on page unload
window.addEventListener("beforeunload", () => {
    if (window.dashboard) {
        window.dashboard.stopAutoRefresh();
    }
});
