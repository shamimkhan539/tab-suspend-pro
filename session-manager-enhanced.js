// Enhanced Session Management with Full Integration
class SessionManager {
    constructor() {
        this.sessions = [];
        this.templates = [];
        this.analytics = {
            sessionsCreated: 0,
            sessionsRestored: 0,
            averageTabsPerSession: 0,
            mostUsedTemplate: null,
            sessionCreationTrend: [],
            productivityScore: 0,
        };
        this.settings = {
            autoSave: true,
            maxSessions: 50,
            compressionEnabled: true,
            cloudSyncEnabled: false,
            analyticsEnabled: true,
            encryptSessions: false,
        };
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.updateUI();
        this.startAnalyticsTracking();
    }

    async loadData() {
        try {
            const data = await chrome.storage.local.get([
                "savedSessions",
                "sessionTemplates",
                "sessionAnalytics",
                "sessionSettings",
            ]);

            this.sessions = data.savedSessions || [];
            this.templates = data.sessionTemplates || [];
            this.analytics = {
                ...this.analytics,
                ...(data.sessionAnalytics || {}),
            };
            this.settings = {
                ...this.settings,
                ...(data.sessionSettings || {}),
            };
        } catch (error) {
            console.error("Error loading session data:", error);
        }
    }

    async saveData() {
        try {
            await chrome.storage.local.set({
                savedSessions: this.sessions,
                sessionTemplates: this.templates,
                sessionAnalytics: this.analytics,
                sessionSettings: this.settings,
            });
        } catch (error) {
            console.error("Error saving session data:", error);
        }
    }

    setupEventListeners() {
        // Session management buttons
        document
            .getElementById("save-current-session")
            ?.addEventListener("click", () => {
                this.saveCurrentSession();
            });

        document
            .getElementById("create-template")
            ?.addEventListener("click", () => {
                this.createTemplate();
            });

        document
            .getElementById("bulk-save-sessions")
            ?.addEventListener("click", () => {
                this.bulkSaveSessions();
            });

        document
            .getElementById("export-sessions")
            ?.addEventListener("click", () => {
                this.exportSessions();
            });

        document
            .getElementById("import-sessions")
            ?.addEventListener("change", (e) => {
                this.importSessions(e.target.files[0]);
            });

        // Search and filter
        document
            .getElementById("session-search")
            ?.addEventListener("input", (e) => {
                this.filterSessions(e.target.value);
            });

        document
            .getElementById("session-sort")
            ?.addEventListener("change", (e) => {
                this.sortSessions(e.target.value);
            });

        // Analytics controls
        document
            .getElementById("generate-report")
            ?.addEventListener("click", () => {
                this.generateAnalyticsReport();
            });

        document
            .getElementById("clear-analytics")
            ?.addEventListener("click", () => {
                this.clearAnalytics();
            });

        // Cloud sync
        document
            .getElementById("sync-to-cloud")
            ?.addEventListener("click", () => {
                this.syncToCloud();
            });

        // Settings
        document
            .getElementById("session-settings-btn")
            ?.addEventListener("click", () => {
                document.getElementById(
                    "session-settings-modal"
                ).style.display = "block";
            });
    }

    async saveCurrentSession() {
        try {
            const tabs = await chrome.tabs.query({ currentWindow: true });
            const sessionName = await this.promptForSessionName();

            if (!sessionName) return;

            const session = {
                id: this.generateId(),
                name: sessionName,
                tabs: tabs.map((tab) => ({
                    url: tab.url,
                    title: tab.title,
                    favIconUrl: tab.favIconUrl,
                    pinned: tab.pinned,
                    index: tab.index,
                })),
                windowId: tabs[0]?.windowId,
                created: new Date().toISOString(),
                lastAccessed: new Date().toISOString(),
                tags: [],
                category: "general",
                metadata: {
                    tabCount: tabs.length,
                    hasAudio: tabs.some((tab) => tab.audible),
                    hasPinned: tabs.some((tab) => tab.pinned),
                    domains: [
                        ...new Set(
                            tabs.map((tab) => new URL(tab.url).hostname)
                        ),
                    ],
                    totalMemory: await this.calculateMemoryUsage(tabs),
                },
            };

            this.sessions.unshift(session);

            // Limit sessions if needed
            if (this.sessions.length > this.settings.maxSessions) {
                this.sessions = this.sessions.slice(
                    0,
                    this.settings.maxSessions
                );
            }

            await this.saveData();
            this.updateAnalytics("sessionCreated", session);
            this.updateUI();
            this.showNotification("Session saved successfully!", "success");

            // Auto-sync to cloud if enabled
            if (this.settings.cloudSyncEnabled) {
                await this.syncToCloud();
            }
        } catch (error) {
            console.error("Error saving session:", error);
            this.showNotification("Failed to save session", "error");
        }
    }

    async restoreSession(sessionId) {
        try {
            const session = this.sessions.find((s) => s.id === sessionId);
            if (!session) {
                throw new Error("Session not found");
            }

            // Create new window for session
            const window = await chrome.windows.create({ focused: true });

            // Remove the default new tab
            const defaultTab = await chrome.tabs.query({ windowId: window.id });
            if (defaultTab.length > 0) {
                await chrome.tabs.remove(defaultTab[0].id);
            }

            // Restore tabs with enhanced options
            const restoredTabs = [];
            for (const [index, tabData] of session.tabs.entries()) {
                try {
                    const tab = await chrome.tabs.create({
                        windowId: window.id,
                        url: tabData.url,
                        pinned: tabData.pinned,
                        index: index,
                        active: index === 0,
                    });
                    restoredTabs.push(tab);
                } catch (error) {
                    console.warn(
                        `Failed to restore tab: ${tabData.url}`,
                        error
                    );
                }
            }

            // Update session metadata
            session.lastAccessed = new Date().toISOString();
            session.accessCount = (session.accessCount || 0) + 1;

            await this.saveData();
            this.updateAnalytics("sessionRestored", session);
            this.updateUI();
            this.showNotification(
                `Restored session "${session.name}" with ${restoredTabs.length} tabs`,
                "success"
            );
        } catch (error) {
            console.error("Error restoring session:", error);
            this.showNotification("Failed to restore session", "error");
        }
    }

    async deleteSession(sessionId) {
        if (!confirm("Are you sure you want to delete this session?")) return;

        try {
            this.sessions = this.sessions.filter((s) => s.id !== sessionId);
            await this.saveData();
            this.updateAnalytics("sessionDeleted");
            this.updateUI();
            this.showNotification("Session deleted successfully", "success");
        } catch (error) {
            console.error("Error deleting session:", error);
            this.showNotification("Failed to delete session", "error");
        }
    }

    async createTemplate() {
        try {
            const tabs = await chrome.tabs.query({ currentWindow: true });
            const templateName = await this.promptForTemplateName();

            if (!templateName) return;

            const template = {
                id: this.generateId(),
                name: templateName,
                tabs: tabs.map((tab) => ({
                    url: tab.url,
                    title: tab.title,
                    pinned: tab.pinned,
                })),
                created: new Date().toISOString(),
                category: "template",
                usage: 0,
                tags: [],
                metadata: {
                    tabCount: tabs.length,
                    domains: [
                        ...new Set(
                            tabs.map((tab) => new URL(tab.url).hostname)
                        ),
                    ],
                },
            };

            this.templates.push(template);
            await this.saveData();
            this.updateUI();
            this.showNotification("Template created successfully!", "success");
        } catch (error) {
            console.error("Error creating template:", error);
            this.showNotification("Failed to create template", "error");
        }
    }

    async restoreTemplate(templateId) {
        try {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template) {
                throw new Error("Template not found");
            }

            const window = await chrome.windows.create({ focused: true });
            const defaultTab = await chrome.tabs.query({ windowId: window.id });
            if (defaultTab.length > 0) {
                await chrome.tabs.remove(defaultTab[0].id);
            }

            for (const [index, tabData] of template.tabs.entries()) {
                await chrome.tabs.create({
                    windowId: window.id,
                    url: tabData.url,
                    pinned: tabData.pinned,
                    index: index,
                    active: index === 0,
                });
            }

            // Update template usage
            template.usage = (template.usage || 0) + 1;
            template.lastUsed = new Date().toISOString();

            await this.saveData();
            this.updateAnalytics("templateUsed", template);
            this.updateUI();
            this.showNotification(
                `Template "${template.name}" restored`,
                "success"
            );
        } catch (error) {
            console.error("Error restoring template:", error);
            this.showNotification("Failed to restore template", "error");
        }
    }

    async bulkSaveSessions() {
        try {
            const windows = await chrome.windows.getAll({ populate: true });
            let savedCount = 0;

            for (const window of windows) {
                if (window.tabs.length > 1) {
                    const sessionName = `Bulk Session ${new Date().toLocaleString()}`;
                    const session = {
                        id: this.generateId(),
                        name: sessionName,
                        tabs: window.tabs.map((tab) => ({
                            url: tab.url,
                            title: tab.title,
                            favIconUrl: tab.favIconUrl,
                            pinned: tab.pinned,
                            index: tab.index,
                        })),
                        windowId: window.id,
                        created: new Date().toISOString(),
                        lastAccessed: new Date().toISOString(),
                        category: "bulk",
                        metadata: {
                            tabCount: window.tabs.length,
                            hasAudio: window.tabs.some((tab) => tab.audible),
                            hasPinned: window.tabs.some((tab) => tab.pinned),
                        },
                    };

                    this.sessions.unshift(session);
                    savedCount++;
                }
            }

            await this.saveData();
            this.updateUI();
            this.showNotification(
                `Saved ${savedCount} sessions in bulk`,
                "success"
            );
        } catch (error) {
            console.error("Error in bulk save:", error);
            this.showNotification("Failed to bulk save sessions", "error");
        }
    }

    async exportSessions() {
        try {
            const exportData = {
                version: "2.1.0",
                exported: new Date().toISOString(),
                sessions: this.sessions,
                templates: this.templates,
                analytics: this.analytics,
                settings: this.settings,
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: "application/json",
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tab-suspend-pro-sessions-${
                new Date().toISOString().split("T")[0]
            }.json`;
            a.click();

            URL.revokeObjectURL(url);
            this.showNotification("Sessions exported successfully", "success");
        } catch (error) {
            console.error("Error exporting sessions:", error);
            this.showNotification("Failed to export sessions", "error");
        }
    }

    async importSessions(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            if (importData.sessions) {
                const newSessions = importData.sessions.filter(
                    (session) => !this.sessions.find((s) => s.id === session.id)
                );
                this.sessions = [...newSessions, ...this.sessions];
            }

            if (importData.templates) {
                const newTemplates = importData.templates.filter(
                    (template) =>
                        !this.templates.find((t) => t.id === template.id)
                );
                this.templates = [...newTemplates, ...this.templates];
            }

            await this.saveData();
            this.updateUI();
            this.showNotification(
                `Imported ${importData.sessions?.length || 0} sessions and ${
                    importData.templates?.length || 0
                } templates`,
                "success"
            );
        } catch (error) {
            console.error("Error importing sessions:", error);
            this.showNotification("Failed to import sessions", "error");
        }
    }

    filterSessions(query) {
        const filtered = this.sessions.filter(
            (session) =>
                session.name.toLowerCase().includes(query.toLowerCase()) ||
                session.tabs.some(
                    (tab) =>
                        tab.title.toLowerCase().includes(query.toLowerCase()) ||
                        tab.url.toLowerCase().includes(query.toLowerCase())
                )
        );
        this.renderSessions(filtered);
    }

    sortSessions(criteria) {
        let sorted = [...this.sessions];

        switch (criteria) {
            case "name":
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "created":
                sorted.sort(
                    (a, b) => new Date(b.created) - new Date(a.created)
                );
                break;
            case "accessed":
                sorted.sort(
                    (a, b) =>
                        new Date(b.lastAccessed) - new Date(a.lastAccessed)
                );
                break;
            case "tabs":
                sorted.sort((a, b) => b.tabs.length - a.tabs.length);
                break;
        }

        this.renderSessions(sorted);
    }

    updateAnalytics(event, data = null) {
        if (!this.settings.analyticsEnabled) return;

        switch (event) {
            case "sessionCreated":
                this.analytics.sessionsCreated++;
                this.analytics.sessionCreationTrend.push({
                    date: new Date().toISOString(),
                    count: data.tabs.length,
                });
                break;
            case "sessionRestored":
                this.analytics.sessionsRestored++;
                break;
            case "templateUsed":
                if (
                    !this.analytics.mostUsedTemplate ||
                    data.usage >
                        this.templates.find(
                            (t) => t.id === this.analytics.mostUsedTemplate
                        )?.usage
                ) {
                    this.analytics.mostUsedTemplate = data.id;
                }
                break;
        }

        // Calculate average tabs per session
        if (this.sessions.length > 0) {
            this.analytics.averageTabsPerSession =
                this.sessions.reduce((sum, s) => sum + s.tabs.length, 0) /
                this.sessions.length;
        }

        // Calculate productivity score
        this.analytics.productivityScore = this.calculateProductivityScore();
    }

    calculateProductivityScore() {
        const factors = {
            sessionUsage:
                Math.min(
                    this.analytics.sessionsRestored /
                        Math.max(this.analytics.sessionsCreated, 1),
                    1
                ) * 30,
            sessionOrganization: Math.min(this.sessions.length / 10, 1) * 25,
            templateUsage:
                Math.min(
                    this.templates.reduce((sum, t) => sum + (t.usage || 0), 0) /
                        10,
                    1
                ) * 25,
            consistency:
                Math.min(this.analytics.sessionCreationTrend.length / 30, 1) *
                20,
        };

        return Math.round(
            Object.values(factors).reduce((sum, score) => sum + score, 0)
        );
    }

    async generateAnalyticsReport() {
        const report = {
            generated: new Date().toISOString(),
            summary: {
                totalSessions: this.sessions.length,
                totalTemplates: this.templates.length,
                ...this.analytics,
            },
            insights: this.generateInsights(),
            recommendations: this.generateRecommendations(),
        };

        // Send report to dashboard
        chrome.runtime.sendMessage({
            action: "updateSessionAnalytics",
            data: report,
        });

        this.showNotification("Analytics report generated", "success");
        return report;
    }

    generateInsights() {
        const insights = [];

        if (
            this.analytics.sessionsCreated >
            this.analytics.sessionsRestored * 2
        ) {
            insights.push(
                "You create more sessions than you restore - consider cleaning up unused sessions"
            );
        }

        if (this.analytics.averageTabsPerSession > 15) {
            insights.push(
                "Your sessions have many tabs - consider breaking them into smaller, focused sessions"
            );
        }

        if (this.templates.length === 0) {
            insights.push(
                "Create templates for your common workflows to boost productivity"
            );
        }

        return insights;
    }

    generateRecommendations() {
        const recommendations = [];

        if (this.analytics.productivityScore < 50) {
            recommendations.push(
                "Use sessions more regularly to improve your productivity score"
            );
        }

        if (!this.settings.cloudSyncEnabled) {
            recommendations.push(
                "Enable cloud sync to backup your sessions across devices"
            );
        }

        if (this.sessions.length > 30) {
            recommendations.push(
                "Archive old sessions to keep your workspace organized"
            );
        }

        return recommendations;
    }

    updateUI() {
        this.renderSessions(this.sessions);
        this.renderTemplates(this.templates);
        this.renderAnalytics();
    }

    renderSessions(sessions) {
        const container = document.getElementById("sessions-container");
        if (!container) return;

        container.innerHTML = sessions
            .map(
                (session) => `
            <div class="session-card" data-session-id="${session.id}">
                <div class="session-header">
                    <h3 class="session-name">${session.name}</h3>
                    <div class="session-actions">
                        <button class="btn-icon" onclick="sessionManager.restoreSession('${
                            session.id
                        }')" title="Restore Session">
                            🔄
                        </button>
                        <button class="btn-icon" onclick="sessionManager.editSession('${
                            session.id
                        }')" title="Edit Session">
                            ✏️
                        </button>
                        <button class="btn-icon btn-danger" onclick="sessionManager.deleteSession('${
                            session.id
                        }')" title="Delete Session">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="session-meta">
                    <span class="tab-count">${session.tabs.length} tabs</span>
                    <span class="session-date">${new Date(
                        session.created
                    ).toLocaleDateString()}</span>
                    <span class="session-category">${
                        session.category || "general"
                    }</span>
                </div>
                <div class="session-tabs">
                    ${session.tabs
                        .slice(0, 5)
                        .map(
                            (tab) => `
                        <div class="tab-preview" title="${tab.title}">
                            <img src="${
                                tab.favIconUrl || "icons/icon16.png"
                            }" alt="" class="tab-favicon">
                            <span class="tab-title">${tab.title}</span>
                        </div>
                    `
                        )
                        .join("")}
                    ${
                        session.tabs.length > 5
                            ? `<div class="more-tabs">+${
                                  session.tabs.length - 5
                              } more</div>`
                            : ""
                    }
                </div>
                ${
                    session.tags && session.tags.length > 0
                        ? `
                    <div class="session-tags">
                        ${session.tags
                            .map((tag) => `<span class="tag">${tag}</span>`)
                            .join("")}
                    </div>
                `
                        : ""
                }
            </div>
        `
            )
            .join("");
    }

    renderTemplates(templates) {
        const container = document.getElementById("templates-container");
        if (!container) return;

        container.innerHTML = templates
            .map(
                (template) => `
            <div class="template-card" data-template-id="${template.id}">
                <div class="template-header">
                    <h3 class="template-name">${template.name}</h3>
                    <div class="template-actions">
                        <button class="btn-icon" onclick="sessionManager.restoreTemplate('${
                            template.id
                        }')" title="Use Template">
                            🚀
                        </button>
                        <button class="btn-icon" onclick="sessionManager.editTemplate('${
                            template.id
                        }')" title="Edit Template">
                            ✏️
                        </button>
                        <button class="btn-icon btn-danger" onclick="sessionManager.deleteTemplate('${
                            template.id
                        }')" title="Delete Template">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="template-meta">
                    <span class="tab-count">${template.tabs.length} tabs</span>
                    <span class="template-usage">Used ${
                        template.usage || 0
                    } times</span>
                </div>
                <div class="template-tabs">
                    ${template.tabs
                        .slice(0, 3)
                        .map(
                            (tab) => `
                        <div class="tab-preview" title="${tab.title}">
                            <span class="tab-domain">${
                                new URL(tab.url).hostname
                            }</span>
                        </div>
                    `
                        )
                        .join("")}
                </div>
            </div>
        `
            )
            .join("");
    }

    renderAnalytics() {
        const container = document.getElementById("analytics-summary");
        if (!container) return;

        container.innerHTML = `
            <div class="analytics-card">
                <h4>📊 Session Statistics</h4>
                <div class="stat-row">
                    <span>Sessions Created:</span>
                    <span>${this.analytics.sessionsCreated}</span>
                </div>
                <div class="stat-row">
                    <span>Sessions Restored:</span>
                    <span>${this.analytics.sessionsRestored}</span>
                </div>
                <div class="stat-row">
                    <span>Avg Tabs/Session:</span>
                    <span>${this.analytics.averageTabsPerSession.toFixed(
                        1
                    )}</span>
                </div>
                <div class="stat-row">
                    <span>Productivity Score:</span>
                    <span class="productivity-score">${
                        this.analytics.productivityScore
                    }/100</span>
                </div>
            </div>
        `;
    }

    // Utility methods
    async promptForSessionName() {
        return (
            prompt("Enter session name:") ||
            `Session ${new Date().toLocaleDateString()}`
        );
    }

    async promptForTemplateName() {
        return (
            prompt("Enter template name:") ||
            `Template ${new Date().toLocaleDateString()}`
        );
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async calculateMemoryUsage(tabs) {
        // Estimate memory usage based on tab count and content
        return tabs.length * 50; // Rough estimate in MB
    }

    showNotification(message, type = "info") {
        const notification = document.createElement("div");
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        const style = {
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "12px 16px",
            borderRadius: "6px",
            zIndex: "10000",
            color: "white",
            fontWeight: "500",
        };

        switch (type) {
            case "success":
                style.background = "#10b981";
                break;
            case "error":
                style.background = "#ef4444";
                break;
            default:
                style.background = "#3b82f6";
        }

        Object.assign(notification.style, style);
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    async syncToCloud() {
        if (!this.settings.cloudSyncEnabled) return;

        try {
            chrome.runtime.sendMessage({
                action: "syncSessionsToCloud",
                data: {
                    sessions: this.sessions,
                    templates: this.templates,
                    analytics: this.analytics,
                },
            });

            this.showNotification("Syncing to cloud...", "info");
        } catch (error) {
            console.error("Error syncing to cloud:", error);
            this.showNotification("Failed to sync to cloud", "error");
        }
    }

    startAnalyticsTracking() {
        if (!this.settings.analyticsEnabled) return;

        // Track daily session creation patterns
        setInterval(() => {
            this.updateAnalytics("dailyCheck");
        }, 24 * 60 * 60 * 1000); // Daily
    }
}

// Global instance
let sessionManager;

// Initialize when DOM loads
document.addEventListener("DOMContentLoaded", () => {
    sessionManager = new SessionManager();
});

// Export for HTML buttons
window.sessionManager = sessionManager;
