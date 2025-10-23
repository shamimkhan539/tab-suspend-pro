// Session Management Module for BrowserGuard Pro
class SessionManager {
    constructor() {
        this.sessionTemplates = new Map();
        this.scheduledSessions = new Map();
        this.sessionHistory = [];
        this.maxHistoryEntries = 100;
        this.init();
    }

    async init() {
        await this.loadSessionData();
        this.setupAlarms();
        console.log("Session Manager initialized");
    }

    async loadSessionData() {
        try {
            const data = await chrome.storage.local.get([
                "sessionTemplates",
                "sessionHistory",
                "scheduledSessions",
            ]);

            if (data.sessionTemplates) {
                this.sessionTemplates = new Map(
                    Object.entries(data.sessionTemplates)
                );
            }
            if (data.sessionHistory) {
                this.sessionHistory = data.sessionHistory;
            }
            if (data.scheduledSessions) {
                this.scheduledSessions = new Map(
                    Object.entries(data.scheduledSessions)
                );
            }
        } catch (error) {
            console.error("Error loading session data:", error);
        }
    }

    async saveSessionData() {
        try {
            await chrome.storage.local.set({
                sessionTemplates: Object.fromEntries(this.sessionTemplates),
                sessionHistory: this.sessionHistory,
                scheduledSessions: Object.fromEntries(this.scheduledSessions),
            });
        } catch (error) {
            console.error("Error saving session data:", error);
        }
    }

    // Session Snapshots: Save complete browser sessions
    async saveCompleteSession(name = null) {
        try {
            const windows = await chrome.windows.getAll({ populate: true });
            const sessionName =
                name || `Session ${new Date().toLocaleString()}`;

            const session = {
                id: this.generateSessionId(),
                name: sessionName,
                timestamp: Date.now(),
                type: "complete",
                windows: windows.map((window) => ({
                    id: window.id,
                    focused: window.focused,
                    incognito: window.incognito,
                    type: window.type,
                    state: window.state,
                    bounds: {
                        left: window.left,
                        top: window.top,
                        width: window.width,
                        height: window.height,
                    },
                    tabs: window.tabs.map((tab) => ({
                        id: tab.id,
                        url: tab.url,
                        title: tab.title,
                        favIconUrl: tab.favIconUrl,
                        pinned: tab.pinned,
                        active: tab.active,
                        index: tab.index,
                        groupId: tab.groupId,
                        highlighted: tab.highlighted,
                        status: tab.status,
                    })),
                })),
                tabGroups: await this.getTabGroupsInfo(windows),
                stats: {
                    totalWindows: windows.length,
                    totalTabs: windows.reduce(
                        (sum, w) => sum + w.tabs.length,
                        0
                    ),
                    incognitoWindows: windows.filter((w) => w.incognito).length,
                },
            };

            // Add to history
            this.sessionHistory.unshift(session);
            if (this.sessionHistory.length > this.maxHistoryEntries) {
                this.sessionHistory = this.sessionHistory.slice(
                    0,
                    this.maxHistoryEntries
                );
            }

            await this.saveSessionData();
            return session;
        } catch (error) {
            console.error("Error saving complete session:", error);
            throw error;
        }
    }

    async getTabGroupsInfo(windows) {
        const groups = [];
        for (const window of windows) {
            try {
                const windowGroups = await chrome.tabGroups.query({
                    windowId: window.id,
                });
                groups.push(
                    ...windowGroups.map((group) => ({
                        id: group.id,
                        windowId: window.id,
                        title: group.title,
                        color: group.color,
                        collapsed: group.collapsed,
                    }))
                );
            } catch (error) {
                // Tab groups might not be available in some contexts
            }
        }
        return groups;
    }

    // Session Templates: Create reusable session templates
    async createSessionTemplate(name, workflowType = "general") {
        try {
            const session = await this.saveCompleteSession();
            const template = {
                id: this.generateSessionId(),
                name: name,
                workflowType: workflowType,
                createdAt: Date.now(),
                baseSession: session,
                usageCount: 0,
                tags: [workflowType],
            };

            // Ensure sessionTemplates is initialized as a Map
            if (
                !this.sessionTemplates ||
                !(this.sessionTemplates instanceof Map)
            ) {
                this.sessionTemplates = new Map();
            }

            this.sessionTemplates.set(template.id, template);
            await this.saveSessionData();
            return template;
        } catch (error) {
            console.error("Error creating session template:", error);
            throw error;
        }
    }

    // Session Scheduler: Auto-save sessions at intervals
    setupAlarms() {
        // Daily auto-save
        chrome.alarms.create("dailySessionSave", {
            when: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            periodInMinutes: 24 * 60, // Daily
        });

        // Weekly auto-save
        chrome.alarms.create("weeklySessionSave", {
            when: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
            periodInMinutes: 7 * 24 * 60, // Weekly
        });
    }

    async handleAlarm(alarm) {
        switch (alarm.name) {
            case "dailySessionSave":
                await this.saveCompleteSession("Daily Auto-Save");
                break;
            case "weeklySessionSave":
                await this.saveCompleteSession("Weekly Auto-Save");
                break;
        }
    }

    // Restore session
    async restoreSession(sessionId, options = {}) {
        try {
            const session = this.sessionHistory.find((s) => s.id === sessionId);
            if (!session) {
                throw new Error("Session not found");
            }

            const { closeCurrentTabs = false, newWindows = true } = options;

            if (closeCurrentTabs) {
                const currentTabs = await chrome.tabs.query({});
                await Promise.all(
                    currentTabs.map((tab) => chrome.tabs.remove(tab.id))
                );
            }

            const restoredWindows = [];
            for (const windowData of session.windows) {
                if (windowData.incognito) continue; // Skip incognito windows for security

                const windowCreateData = {
                    focused: windowData.focused || false,
                    type: "normal", // Always use normal type for safety
                };

                // Don't set window state at all to avoid Chrome API conflicts
                // Chrome will use its default behavior which is safer

                // Apply basic bounds if available, with safe defaults
                if (
                    windowData.bounds &&
                    typeof windowData.bounds === "object"
                ) {
                    try {
                        if (
                            typeof windowData.bounds.width === "number" &&
                            windowData.bounds.width > 0
                        ) {
                            windowCreateData.width = Math.max(
                                400,
                                Math.min(1920, windowData.bounds.width)
                            );
                        }
                        if (
                            typeof windowData.bounds.height === "number" &&
                            windowData.bounds.height > 0
                        ) {
                            windowCreateData.height = Math.max(
                                300,
                                Math.min(1080, windowData.bounds.height)
                            );
                        }
                        // Don't set left/top to avoid positioning issues
                    } catch (boundsError) {
                        console.warn(
                            "Error applying window bounds:",
                            boundsError
                        );
                        // Continue without bounds
                    }
                }

                // Create window with first tab
                if (windowData.tabs.length > 0) {
                    windowCreateData.url = windowData.tabs[0].url;

                    let newWindow;
                    try {
                        newWindow = await chrome.windows.create(
                            windowCreateData
                        );
                    } catch (windowError) {
                        console.warn(
                            "Failed to create window with full params, trying minimal config:",
                            windowError
                        );
                        // Fallback to minimal window creation
                        try {
                            newWindow = await chrome.windows.create({
                                url: windowData.tabs[0].url,
                                type: "normal",
                            });
                        } catch (fallbackError) {
                            console.error(
                                "Failed to create window even with minimal config:",
                                fallbackError
                            );
                            continue; // Skip this window and try the next one
                        }
                    }
                    restoredWindows.push(newWindow);

                    // Create remaining tabs
                    for (let i = 1; i < windowData.tabs.length; i++) {
                        const tabData = windowData.tabs[i];
                        await chrome.tabs.create({
                            windowId: newWindow.id,
                            url: tabData.url,
                            pinned: tabData.pinned,
                            active: tabData.active,
                            index: tabData.index,
                        });
                    }

                    // Restore tab groups
                    await this.restoreTabGroups(
                        newWindow.id,
                        windowData.tabs,
                        session.tabGroups
                    );
                }
            }

            return {
                success: true,
                restoredWindows: restoredWindows.length,
                restoredTabs: session.stats.totalTabs,
            };
        } catch (error) {
            console.error("Error restoring session:", error);
            throw error;
        }
    }

    async restoreTabGroups(windowId, tabs, groups) {
        const windowGroups = groups.filter((g) => g.windowId === windowId);
        const currentTabs = await chrome.tabs.query({ windowId });

        for (const groupData of windowGroups) {
            const groupTabs = tabs.filter((t) => t.groupId === groupData.id);
            const tabIds = groupTabs
                .map((t) => {
                    const currentTab = currentTabs.find(
                        (ct) => ct.url === t.url && ct.index === t.index
                    );
                    return currentTab?.id;
                })
                .filter(Boolean);

            if (tabIds.length > 0) {
                try {
                    const groupId = await chrome.tabs.group({ tabIds });
                    await chrome.tabGroups.update(groupId, {
                        title: groupData.title,
                        color: groupData.color,
                        collapsed: groupData.collapsed,
                    });
                } catch (error) {
                    console.warn("Error restoring tab group:", error);
                }
            }
        }
    }

    // Cloud Session Sync
    async syncToCloud(provider = "google") {
        try {
            const sessionData = {
                templates: Object.fromEntries(this.sessionTemplates),
                history: this.sessionHistory,
                lastSync: Date.now(),
            };

            switch (provider) {
                case "google":
                    return await this.syncToGoogleDrive(sessionData);
                case "dropbox":
                    return await this.syncToDropbox(sessionData);
                default:
                    throw new Error("Unsupported cloud provider");
            }
        } catch (error) {
            console.error("Error syncing to cloud:", error);
            throw error;
        }
    }

    async syncToGoogleDrive(data) {
        // Implementation for Google Drive sync
        // This would require OAuth2 authentication
        console.log("Google Drive sync would be implemented here");
        return { success: true, provider: "google" };
    }

    async syncToDropbox(data) {
        // Implementation for Dropbox sync
        console.log("Dropbox sync would be implemented here");
        return { success: true, provider: "dropbox" };
    }

    // Utility methods
    generateSessionId() {
        return `session_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
    }

    async getSessionStats() {
        return {
            totalSessions: this.sessionHistory.length,
            totalTemplates: this.sessionTemplates.size,
            oldestSession:
                this.sessionHistory[this.sessionHistory.length - 1]?.timestamp,
            newestSession: this.sessionHistory[0]?.timestamp,
            averageTabsPerSession:
                this.sessionHistory.reduce(
                    (sum, s) => sum + s.stats.totalTabs,
                    0
                ) / this.sessionHistory.length || 0,
        };
    }

    // Get sessions for UI
    async getSessions(limit = 20) {
        return this.sessionHistory.slice(0, limit);
    }

    async getTemplates() {
        return Array.from(this.sessionTemplates.values());
    }

    async deleteSession(sessionId) {
        this.sessionHistory = this.sessionHistory.filter(
            (s) => s.id !== sessionId
        );
        await this.saveSessionData();
    }

    async deleteTemplate(templateId) {
        this.sessionTemplates.delete(templateId);
        await this.saveSessionData();
    }
}

// Export for use in background script
if (typeof module !== "undefined" && module.exports) {
    module.exports = SessionManager;
}
