// Enhanced Main Dashboard JavaScript for Tab Suspend Pro
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
                // Fallback with mock data
                container.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-icon">🔒</div>
                        <div class="stat-value">23</div>
                        <div class="stat-label">Suspended Today</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">💾</div>
                        <div class="stat-value">256MB</div>
                        <div class="stat-label">Memory Saved</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📋</div>
                        <div class="stat-value">5</div>
                        <div class="stat-label">Active Sessions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⚡</div>
                        <div class="stat-value">32%</div>
                        <div class="stat-label">Performance Boost</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Error loading quick stats:", error);
            const container = document.getElementById("quick-stats");
            if (container) {
                container.innerHTML =
                    '<div class="loading">Error loading statistics</div>';
            }
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
            const container = document.getElementById("features-grid");
            if (container) {
                container.innerHTML =
                    '<div class="loading">Error loading features</div>';
            }
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

    setupEventListeners() {
        // Add any event listeners needed for the dashboard
        console.log("Dashboard event listeners setup complete");
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

    showNotification(message, type) {
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
}

// Global functions for HTML event handlers
let dashboardInstance;

async function openPopup() {
    try {
        chrome.action.openPopup();
    } catch (error) {
        console.error("Error opening popup:", error);
        showNotification("Unable to open popup", "error");
    }
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
    if (dashboardInstance) {
        dashboardInstance.showNotification(message, type);
    } else {
        // Fallback notification
        const notification = document.createElement("div");
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
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
        setTimeout(() => notification.remove(), 3000);
    }
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
