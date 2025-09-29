// Background service worker for Tab Suspend Pro
class TabSuspendManager {
    constructor() {
        this.tabActivity = new Map();
        this.suspendedTabs = new Set();
        this.suspendedMeta = new Map(); // tabId -> { originalUrl, title, favicon, suspendedAt }
        this.lostSuspended = []; // [{ originalUrl, title, favicon, suspendedAt, lostAt, lastTabId }]
        this.metadataVersion = 1; // increment if structure changes
        this.isRecreating = false; // Flag to prevent infinite recreation loops
        this.lastRecreationTime = 0; // Track last recreation attempt
        this.settings = {
            enabled: true,
            autoSuspendTime: 30,
            excludedGroups: [],
            whitelistedUrls: [
                "chrome://",
                "chrome-extension://",
                "edge://",
                "about:",
            ],
            savedGroupsEnabled: false,
        };
        this.init();
    }

    async init() {
        try {
            await this.loadSettings();
            await this.loadSuspendedMeta();
            await this.reconstructSuspendedTabs(); // Rebuild suspended state after update/reload
            await this.restoreOrphanedSuspendedTabs(); // Recreate missing suspended tabs
            this.setupContextMenus();
            this.setupEventListeners();
            this.setupMessageHandlers();
            this.startMonitoring();
            this.startMetadataCleanup();
            console.log("Tab Suspend Pro initialized");
        } catch (error) {
            console.error("Error initializing extension:", error);
        }
    }

    async loadSuspendedMeta() {
        try {
            const data = await chrome.storage.local.get(["suspendedTabState"]);
            const raw = data.suspendedTabState;
            if (!raw) return;

            // Detect new format
            if (
                raw &&
                typeof raw === "object" &&
                "version" in raw &&
                "active" in raw
            ) {
                if (raw.version !== this.metadataVersion) {
                    console.log(
                        "[Meta] Migrating metadata from version",
                        raw.version,
                        "to",
                        this.metadataVersion
                    );
                    // For now same shape; future migrations go here
                }
                const active = raw.active || {};
                Object.entries(active).forEach(([id, meta]) => {
                    const idNum = parseInt(id, 10);
                    if (!isNaN(idNum) && meta && meta.originalUrl) {
                        this.suspendedMeta.set(idNum, meta);
                    }
                });
                this.lostSuspended = Array.isArray(raw.lost) ? raw.lost : [];
            } else {
                // Legacy flat object (pre-version)
                for (const [key, value] of Object.entries(raw || {})) {
                    const idNum = parseInt(key, 10);
                    if (!isNaN(idNum) && value && value.originalUrl) {
                        this.suspendedMeta.set(idNum, value);
                    }
                }
                // Wrap into new format on next persist
            }
            if (this.suspendedMeta.size) {
                console.log(
                    "[Load] Restored metadata for",
                    this.suspendedMeta.size,
                    "suspended tabs"
                );
            }
            if (this.lostSuspended.length) {
                console.log(
                    "[Load] Found",
                    this.lostSuspended.length,
                    "previously lost suspended tabs"
                );
            }
        } catch (e) {
            console.warn("Error loading suspended metadata:", e);
        }
    }

    async persistSuspendedMeta() {
        try {
            const active = {};
            for (const [tabId, meta] of this.suspendedMeta.entries())
                active[tabId] = meta;
            await chrome.storage.local.set({
                suspendedTabState: {
                    version: this.metadataVersion,
                    active,
                    lost: this.lostSuspended,
                },
            });
        } catch (e) {
            console.warn("Error persisting suspended metadata:", e);
        }
    }

    async reconstructSuspendedTabs() {
        try {
            const tabs = await chrome.tabs.query({});
            const suspendedPrefix = chrome.runtime.getURL("suspended.html");
            let rebuilt = 0;
            for (const tab of tabs) {
                if (tab.url && tab.url.startsWith(suspendedPrefix)) {
                    this.suspendedTabs.add(tab.id);
                    // If missing metadata, attempt to parse query params and store
                    if (!this.suspendedMeta.has(tab.id)) {
                        try {
                            const u = new URL(tab.url);
                            const originalUrl = u.searchParams.get("url") || "";
                            const title =
                                u.searchParams.get("title") || tab.title || "";
                            const favicon =
                                u.searchParams.get("favicon") ||
                                tab.favIconUrl ||
                                "";
                            if (originalUrl) {
                                this.suspendedMeta.set(tab.id, {
                                    originalUrl,
                                    title,
                                    favicon,
                                    suspendedAt: Date.now(),
                                });
                            }
                        } catch {}
                    }
                    rebuilt++;
                }
            }
            if (rebuilt) {
                await this.persistSuspendedMeta();
            }
            if (rebuilt > 0) {
                console.log(
                    "[Reconstruct] Rebuilt suspended tab state for",
                    rebuilt,
                    "tabs after service worker start"
                );
            }
        } catch (err) {
            console.error("Error reconstructing suspended tabs:", err);
        }
    }

    async restoreOrphanedSuspendedTabs() {
        try {
            // Prevent concurrent recreation attempts
            if (this.isRecreating) {
                console.log("[Recreate] Already in progress, skipping");
                return;
            }

            // Prevent recreation if done recently (within 30 seconds)
            const now = Date.now();
            if (now - this.lastRecreationTime < 30000) {
                console.log("[Recreate] Recently attempted, skipping");
                return;
            }

            if (this.suspendedMeta.size === 0) return;

            this.isRecreating = true;
            this.lastRecreationTime = now;

            const tabs = await chrome.tabs.query({});
            const existingTabIds = new Set(tabs.map((t) => t.id));
            const suspendedPrefix = chrome.runtime.getURL("suspended.html");

            // Also check existing suspended tabs to avoid duplicates
            const existingSuspendedUrls = new Set();
            tabs.forEach((tab) => {
                if (tab.url && tab.url.startsWith(suspendedPrefix)) {
                    try {
                        const url = new URL(tab.url);
                        const originalUrl = url.searchParams.get("url");
                        if (originalUrl) {
                            existingSuspendedUrls.add(originalUrl);
                        }
                    } catch {}
                }
            });

            let recreated = 0;

            // Check for metadata entries that don't have corresponding tabs
            for (const [tabId, meta] of this.suspendedMeta.entries()) {
                if (!existingTabIds.has(tabId)) {
                    // Check if we already have a suspended tab for this URL
                    if (existingSuspendedUrls.has(meta.originalUrl)) {
                        console.log(
                            `[Recreate] Skipping duplicate for ${meta.originalUrl}`
                        );
                        // Clean up the orphaned metadata
                        this.suspendedMeta.delete(tabId);
                        this.suspendedTabs.delete(tabId);
                        continue;
                    }

                    // Tab is missing but we have metadata - recreate it
                    try {
                        const suspendedUrl =
                            suspendedPrefix +
                            "?url=" +
                            encodeURIComponent(meta.originalUrl) +
                            "&title=" +
                            encodeURIComponent(meta.title) +
                            "&favicon=" +
                            encodeURIComponent(meta.favicon || "");

                        const newTab = await chrome.tabs.create({
                            url: suspendedUrl,
                            active: false,
                        });

                        // Update metadata with new tab ID
                        this.suspendedMeta.delete(tabId);
                        this.suspendedMeta.set(newTab.id, {
                            ...meta,
                            recreatedAt: Date.now(),
                        });
                        this.suspendedTabs.delete(tabId);
                        this.suspendedTabs.add(newTab.id);
                        recreated++;

                        // Add to existing URLs to prevent further duplicates
                        existingSuspendedUrls.add(meta.originalUrl);

                        console.log(
                            `[Recreate] Restored suspended tab: ${meta.title}`
                        );
                    } catch (error) {
                        console.warn(
                            `[Recreate] Failed to restore tab: ${meta.title}`,
                            error
                        );
                        // Move to lost list if recreation fails
                        if (
                            !this.lostSuspended.some(
                                (l) => l.originalUrl === meta.originalUrl
                            )
                        ) {
                            this.lostSuspended.push({
                                ...meta,
                                lostAt: Date.now(),
                                lastTabId: tabId,
                            });
                        }
                        this.suspendedMeta.delete(tabId);
                        this.suspendedTabs.delete(tabId);
                    }
                }
            }

            if (recreated > 0) {
                await this.persistSuspendedMeta();
                console.log(
                    `[Recreate] Successfully recreated ${recreated} suspended tabs after extension reload`
                );

                // Show notification to user
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "icons/icon48.png",
                    title: "Tab Suspend Pro",
                    message: `Restored ${recreated} suspended tab${
                        recreated > 1 ? "s" : ""
                    } after extension update`,
                });
            }
        } catch (error) {
            console.error("Error restoring orphaned suspended tabs:", error);
        } finally {
            this.isRecreating = false;
        }
    }

    startMetadataCleanup() {
        // Periodic cleanup every 3 minutes
        setInterval(() => this.cleanupMetadata(), 180000);

        // Disable periodic recovery to prevent infinite loops
        // setInterval(() => this.checkAndRecoverSuspendedTabs(), 120000);
    }

    async checkAndRecoverSuspendedTabs() {
        try {
            if (this.suspendedMeta.size === 0) return;

            const tabs = await chrome.tabs.query({});
            const existingTabIds = new Set(tabs.map((t) => t.id));
            let recoveredCount = 0;

            for (const [tabId, meta] of this.suspendedMeta.entries()) {
                if (!existingTabIds.has(tabId)) {
                    // Tab is missing - try to recreate it
                    const timeSinceCreation =
                        Date.now() - (meta.suspendedAt || Date.now());

                    // Only recover if it's been less than 10 minutes since suspension
                    if (timeSinceCreation < 10 * 60 * 1000) {
                        try {
                            const suspendedUrl =
                                chrome.runtime.getURL("suspended.html") +
                                "?url=" +
                                encodeURIComponent(meta.originalUrl) +
                                "&title=" +
                                encodeURIComponent(meta.title) +
                                "&favicon=" +
                                encodeURIComponent(meta.favicon || "");

                            const newTab = await chrome.tabs.create({
                                url: suspendedUrl,
                                active: false,
                            });

                            // Update metadata with new tab ID
                            this.suspendedMeta.delete(tabId);
                            this.suspendedMeta.set(newTab.id, {
                                ...meta,
                                recoveredAt: Date.now(),
                            });
                            this.suspendedTabs.delete(tabId);
                            this.suspendedTabs.add(newTab.id);
                            recoveredCount++;

                            console.log(
                                `[Recovery] Recovered missing suspended tab: ${meta.title}`
                            );
                        } catch (error) {
                            console.warn(
                                `[Recovery] Failed to recover tab: ${meta.title}`,
                                error
                            );
                        }
                    }
                }
            }

            if (recoveredCount > 0) {
                await this.persistSuspendedMeta();
                console.log(
                    `[Recovery] Recovered ${recoveredCount} missing suspended tabs`
                );
            }
        } catch (error) {
            console.error("Error in recovery check:", error);
        }
    }

    async cleanupMetadata() {
        try {
            const tabs = await chrome.tabs.query({});
            const existingIds = new Set(tabs.map((t) => t.id));
            let moved = 0;
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

            for (const tabId of Array.from(this.suspendedMeta.keys())) {
                if (!existingIds.has(tabId)) {
                    const meta = this.suspendedMeta.get(tabId);
                    if (meta) {
                        // Only move to lost after 5 minutes to allow for extension restarts
                        const isOldEnough =
                            (meta.suspendedAt || 0) < fiveMinutesAgo;

                        if (
                            isOldEnough &&
                            !this.lostSuspended.some(
                                (l) => l.originalUrl === meta.originalUrl
                            )
                        ) {
                            this.lostSuspended.push({
                                ...meta,
                                lostAt: Date.now(),
                                lastTabId: tabId,
                            });
                            moved++;
                            this.suspendedMeta.delete(tabId);
                            this.suspendedTabs.delete(tabId);
                        }
                    }
                }
            }
            if (moved) {
                console.log(
                    "[Cleanup] Moved",
                    moved,
                    "orphaned suspended entries to lost list"
                );
                this.persistSuspendedMeta();
            }
            // Prune very old lost entries (> 7 days)
            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const before = this.lostSuspended.length;
            this.lostSuspended = this.lostSuspended.filter(
                (l) => (l.lostAt || l.suspendedAt || 0) > weekAgo
            );
            if (this.lostSuspended.length !== before) {
                console.log(
                    "[Cleanup] Pruned",
                    before - this.lostSuspended.length,
                    "stale lost entries"
                );
                this.persistSuspendedMeta();
            }
        } catch (e) {
            console.warn("Metadata cleanup failed:", e);
        }
    }

    async loadSettings() {
        try {
            const stored = await chrome.storage.sync.get([
                "tabSuspendSettings",
            ]);
            if (stored.tabSuspendSettings) {
                this.settings = Object.assign(
                    this.settings,
                    stored.tabSuspendSettings
                );
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                tabSuspendSettings: this.settings,
            });
        } catch (error) {
            console.error("Error saving settings:", error);
        }
    }

    setupContextMenus() {
        try {
            chrome.contextMenus.removeAll(() => {
                // Context menu for extension icon (action context)
                chrome.contextMenus.create({
                    id: "suspend-current-tab",
                    title: "Suspend This Tab",
                    contexts: ["action"],
                });

                chrome.contextMenus.create({
                    id: "restore-current-tab",
                    title: "Restore This Tab",
                    contexts: ["action"],
                });

                chrome.contextMenus.create({
                    id: "separator1",
                    type: "separator",
                    contexts: ["action"],
                });

                chrome.contextMenus.create({
                    id: "suggest-tabs",
                    title: "Suggest Tabs to Suspend",
                    contexts: ["action"],
                });

                // Context menus for webpage content (page context)
                chrome.contextMenus.create({
                    id: "page-suspend-tab",
                    title: "Suspend This Tab",
                    contexts: ["page"],
                    documentUrlPatterns: ["http://*/*", "https://*/*"],
                });

                chrome.contextMenus.create({
                    id: "page-suspend-group",
                    title: "Suspend Tab Group",
                    contexts: ["page"],
                    documentUrlPatterns: ["http://*/*", "https://*/*"],
                });

                chrome.contextMenus.create({
                    id: "page-save-group",
                    title: "Save Tab Group",
                    contexts: ["page"],
                    documentUrlPatterns: ["http://*/*", "https://*/*"],
                });

                chrome.contextMenus.create({
                    id: "page-save-window",
                    title: "Save Current Window as Group",
                    contexts: ["page"],
                    documentUrlPatterns: ["http://*/*", "https://*/*"],
                });

                chrome.contextMenus.create({
                    id: "separator3",
                    type: "separator",
                    contexts: ["page"],
                    documentUrlPatterns: ["http://*/*", "https://*/*"],
                });

                // Whitelist options
                chrome.contextMenus.create({
                    id: "never-suspend-url",
                    title: "Never Suspend This URL",
                    contexts: ["page"],
                    documentUrlPatterns: ["http://*/*", "https://*/*"],
                });

                chrome.contextMenus.create({
                    id: "never-suspend-domain",
                    title: "Never Suspend This Domain",
                    contexts: ["page"],
                    documentUrlPatterns: ["http://*/*", "https://*/*"],
                });
            });

            console.log("Context menus setup complete");
        } catch (error) {
            console.error("Error setting up context menus:", error);
        }
    }

    setupEventListeners() {
        try {
            chrome.tabs.onActivated.addListener((activeInfo) => {
                chrome.tabs
                    .get(activeInfo.tabId)
                    .then((tab) => {
                        if (!tab.url.includes("suspended.html")) {
                            this.updateTabActivity(activeInfo.tabId);
                        }
                    })
                    .catch(() => {
                        // Ignore errors
                    });
            });

            chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
                if (
                    changeInfo.status === "complete" &&
                    !tab.url.includes("suspended.html")
                ) {
                    this.updateTabActivity(tabId);
                }

                if (
                    this.suspendedTabs.has(tabId) &&
                    changeInfo.url &&
                    !changeInfo.url.includes("suspended.html")
                ) {
                    console.log(
                        "Suspended tab was restored externally:",
                        tabId
                    );
                    this.suspendedTabs.delete(tabId);
                }
            });

            chrome.tabs.onRemoved.addListener((tabId) => {
                this.tabActivity.delete(tabId);

                // For suspended tabs, preserve metadata for potential recreation
                if (
                    this.suspendedTabs.has(tabId) &&
                    this.suspendedMeta.has(tabId)
                ) {
                    const meta = this.suspendedMeta.get(tabId);
                    console.log(
                        `[TabRemoved] Preserving metadata for suspended tab: ${meta.title}`
                    );
                    // Don't delete metadata immediately - let cleanup process handle it
                    // or restoreOrphanedSuspendedTabs will recreate it
                } else {
                    this.suspendedTabs.delete(tabId);
                    this.suspendedMeta.delete(tabId);
                }
            });

            chrome.storage.onChanged.addListener((changes) => {
                if (changes.tabSuspendSettings) {
                    this.settings = Object.assign(
                        this.settings,
                        changes.tabSuspendSettings.newValue
                    );
                }
            });

            chrome.contextMenus.onClicked.addListener(async (info, tab) => {
                await this.handleContextMenuClick(info, tab);
            });

            chrome.commands.onCommand.addListener(async (command) => {
                await this.handleKeyboardShortcut(command);
            });

            // Remove additional runtime event listeners that cause infinite loops
            // The restoration is now only handled during init() phase
            /*
            chrome.runtime.onInstalled.addListener(async (details) => {
                if (
                    details.reason === "update" ||
                    details.reason === "install"
                ) {
                    console.log(
                        `[Runtime] Extension ${details.reason} detected`
                    );
                    // Give chrome time to stabilize tabs after update
                    setTimeout(async () => {
                        await this.restoreOrphanedSuspendedTabs();
                    }, 2000);
                }
            });

            chrome.runtime.onStartup.addListener(async () => {
                console.log("[Runtime] Browser startup detected");
                // Browser restart - restore suspended tabs
                setTimeout(async () => {
                    await this.restoreOrphanedSuspendedTabs();
                }, 1000);
            });
            */
        } catch (error) {
            console.error("Error setting up event listeners:", error);
        }
    }

    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener(
            (message, sender, sendResponse) => {
                this.handleMessage(message, sender, sendResponse);
                return true;
            }
        );
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case "ping":
                    sendResponse({ success: true, ready: true });
                    break;
                case "suspendTab":
                    await this.suspendTab(message.tabId);
                    sendResponse({ success: true });
                    break;
                case "restoreTab":
                    await this.restoreTab(message.tabId);
                    sendResponse({ success: true });
                    break;
                case "suspendTabGroup":
                    await this.suspendTabGroup(message.groupId);
                    sendResponse({ success: true });
                    break;
                case "restoreTabGroup":
                    await this.restoreTabGroup(message.groupId);
                    sendResponse({ success: true });
                    break;
                case "suggestTabs":
                    await this.suggestTabsToSuspend();
                    sendResponse({ success: true });
                    break;
                case "restoreAllTabs":
                    await this.restoreAllTabs();
                    sendResponse({ success: true });
                    break;
                case "restoreLostTabs":
                    await this.restoreLostTabs();
                    sendResponse({ success: true });
                    break;
                case "updateActivity":
                    if (
                        sender.tab &&
                        !sender.tab.url.includes("suspended.html")
                    ) {
                        this.updateTabActivity(sender.tab.id);
                    }
                    sendResponse({ success: true });
                    break;
                case "manualRestore":
                    if (sender.tab) {
                        await this.restoreTab(sender.tab.id);
                    }
                    sendResponse({ success: true });
                    break;
                case "addToWhitelist":
                    await this.addToWhitelist(message.url, message.type);
                    sendResponse({ success: true });
                    break;
                // Tab Groups Saving Actions
                case "saveTabGroup":
                    const savedGroup = await this.saveTabGroup(
                        message.groupId,
                        message.options
                    );
                    sendResponse({ success: true, group: savedGroup });
                    break;
                case "listSavedGroups":
                    const groups = await this.listSavedGroups();
                    sendResponse({ success: true, groups: groups });
                    break;
                case "getSavedGroup":
                    const group = await this.getSavedGroup(message.groupId);
                    sendResponse({ success: true, group: group });
                    break;
                case "restoreSavedGroup":
                    const result = await this.restoreSavedGroup(
                        message.groupId,
                        message.options
                    );
                    sendResponse({ success: true, result: result });
                    break;
                case "deleteSavedGroup":
                    await this.deleteSavedGroup(message.groupId);
                    sendResponse({ success: true });
                    break;
                case "exportSavedGroups":
                    const exportResult = await this.exportSavedGroups();
                    sendResponse({ success: true, result: exportResult });
                    break;
                case "importSavedGroups":
                    const importResult = await this.importSavedGroups(
                        message.fileContent,
                        message.mergeMode
                    );
                    sendResponse({ success: true, result: importResult });
                    break;
                default:
                    sendResponse({ success: false, error: "Unknown action" });
            }
        } catch (error) {
            console.error("Error handling message:", error);
            sendResponse({ success: false, error: error.message });
        }
    }

    updateTabActivity(tabId) {
        this.tabActivity.set(tabId, Date.now());
    }

    async handleContextMenuClick(info, tab) {
        try {
            console.log("Context menu clicked:", info.menuItemId);

            if (!tab) {
                const [activeTab] = await chrome.tabs.query({
                    active: true,
                    currentWindow: true,
                });
                tab = activeTab;
            }

            switch (info.menuItemId) {
                case "suspend-current-tab":
                case "page-suspend-tab":
                    await this.suspendTab(tab.id);
                    break;
                case "restore-current-tab":
                    await this.restoreTab(tab.id);
                    break;
                case "page-suspend-group":
                    if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
                        await this.suspendTabGroup(tab.groupId);
                    }
                    break;
                case "page-save-group":
                    if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
                        await this.saveTabGroup(tab.groupId);
                    } else {
                        chrome.notifications.create({
                            type: "basic",
                            iconUrl: "icons/icon48.png",
                            title: "Tab Suspend Pro",
                            message:
                                'This tab is not in a group. Use "Save Current Window" instead.',
                        });
                    }
                    break;
                case "page-save-window":
                    await this.saveTabGroup(null, { windowId: tab.windowId });
                    break;
                case "suggest-tabs":
                    await this.suggestTabsToSuspend();
                    break;
                case "never-suspend-url":
                    await this.addToWhitelist(tab.url, "url");
                    break;
                case "never-suspend-domain":
                    await this.addToWhitelist(tab.url, "domain");
                    break;
            }
        } catch (error) {
            console.error("Error handling context menu click:", error);
        }
    }

    async handleKeyboardShortcut(command) {
        try {
            console.log("Keyboard shortcut triggered:", command);

            const [activeTab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });

            switch (command) {
                case "suspend-current-tab":
                    await this.suspendTab(activeTab.id);
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "icons/icon48.png",
                        title: "Tab Suspend Pro",
                        message: "Tab suspended: " + activeTab.title,
                    });
                    break;
                case "suspend-tab-group":
                    if (
                        activeTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
                    ) {
                        await this.suspendTabGroup(activeTab.groupId);
                        chrome.notifications.create({
                            type: "basic",
                            iconUrl: "icons/icon48.png",
                            title: "Tab Suspend Pro",
                            message: "Tab group suspended!",
                        });
                    }
                    break;
                case "restore-all-tabs":
                    await this.restoreAllTabs();
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "icons/icon48.png",
                        title: "Tab Suspend Pro",
                        message: "All suspended tabs restored!",
                    });
                    break;
            }
        } catch (error) {
            console.error("Error handling keyboard shortcut:", error);
        }
    }

    async suspendTab(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);

            if (this.isWhitelisted(tab.url)) {
                console.log(
                    "Tab is whitelisted, skipping suspension:",
                    tab.url
                );
                return;
            }

            if (tab.audible) {
                console.log("Tab is playing audio, skipping suspension");
                return;
            }

            if (tab.url.includes("suspended.html")) {
                console.log("Tab is already suspended");
                return;
            }

            const suspendedUrl =
                chrome.runtime.getURL("suspended.html") +
                "?url=" +
                encodeURIComponent(tab.url) +
                "&title=" +
                encodeURIComponent(tab.title) +
                "&favicon=" +
                encodeURIComponent(tab.favIconUrl || "");

            this.suspendedTabs.add(tabId);
            this.suspendedMeta.set(tabId, {
                originalUrl: tab.url,
                title: tab.title,
                favicon: tab.favIconUrl || "",
                suspendedAt: Date.now(),
            });
            this.persistSuspendedMeta();
            await chrome.tabs.update(tabId, { url: suspendedUrl });
            this.tabActivity.delete(tabId);

            console.log("Tab suspended successfully:", tab.title);
        } catch (error) {
            console.error("Error suspending tab:", error);
            this.suspendedTabs.delete(tabId);
        }
    }

    async restoreTab(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (!tab.url || !tab.url.includes("suspended.html")) {
                // Not a suspended placeholder anymore
                this.suspendedTabs.delete(tabId);
                if (this.suspendedMeta.has(tabId)) {
                    // Treat as lost restoration or manual navigation
                    this.suspendedMeta.delete(tabId);
                    await this.persistSuspendedMeta();
                }
                return;
            }

            // Ensure in-memory set is up-to-date (handles extension reloads)
            this.suspendedTabs.add(tabId);

            let originalUrl = "";
            try {
                const suspendedUrl = new URL(tab.url);
                originalUrl = suspendedUrl.searchParams.get("url");
            } catch (e) {
                console.warn(
                    "Could not parse suspended tab URL for restoration",
                    e
                );
            }

            if (!originalUrl && this.suspendedMeta.has(tabId)) {
                originalUrl = this.suspendedMeta.get(tabId).originalUrl;
            }

            if (originalUrl) {
                await chrome.tabs.update(tabId, { url: originalUrl });
                this.suspendedTabs.delete(tabId);
                this.suspendedMeta.delete(tabId);
                await this.persistSuspendedMeta();
                this.updateTabActivity(tabId);
                console.log("Tab restored");
            } else {
                console.warn(
                    "Original URL missing in suspended tab, cannot restore"
                );
            }
        } catch (error) {
            console.error("Error restoring tab:", error);
        }
    }

    async suspendTabGroup(groupId) {
        try {
            const tabs = await chrome.tabs.query({ groupId });
            console.log("Suspending tab group with", tabs.length, "tabs");

            const [activeTab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            let switchToTabId = null;
            const nonGroupTabs = await chrome.tabs.query({
                currentWindow: true,
                groupId: chrome.tabGroups.TAB_GROUP_ID_NONE,
            });

            if (nonGroupTabs.length > 0) {
                switchToTabId = nonGroupTabs[0].id;
            } else {
                const newTab = await chrome.tabs.create({
                    url: "chrome://newtab/",
                    active: false,
                });
                switchToTabId = newTab.id;
            }

            for (const tab of tabs) {
                await this.suspendTab(tab.id);
            }

            if (activeTab && activeTab.groupId === groupId && switchToTabId) {
                await chrome.tabs.update(switchToTabId, { active: true });
            }

            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon48.png",
                title: "Tab Suspend Pro",
                message: "Suspended " + tabs.length + " tabs from the group!",
            });
        } catch (error) {
            console.error("Error suspending tab group:", error);
        }
    }

    async restoreTabGroup(groupId) {
        try {
            const tabs = await chrome.tabs.query({ groupId });
            const restorePromises = tabs
                .filter((tab) => this.suspendedTabs.has(tab.id))
                .map((tab) => this.restoreTab(tab.id));

            await Promise.all(restorePromises);
        } catch (error) {
            console.error("Error restoring tab group:", error);
        }
    }

    async suggestTabsToSuspend() {
        try {
            const tabs = await chrome.tabs.query({});
            const now = Date.now();
            const suggestions = [];

            for (const tab of tabs) {
                if (
                    tab.active ||
                    this.suspendedTabs.has(tab.id) ||
                    this.isWhitelisted(tab.url)
                ) {
                    continue;
                }

                const lastActivity = this.tabActivity.get(tab.id) || 0;
                const inactiveTime = (now - lastActivity) / (1000 * 60);

                if (inactiveTime > 5) {
                    const memoryEstimate = this.estimateTabMemory(tab);

                    suggestions.push({
                        id: tab.id,
                        title: tab.title,
                        url: tab.url,
                        inactiveTime: Math.round(inactiveTime),
                        memoryEstimate: memoryEstimate,
                        score: memoryEstimate + inactiveTime * 2,
                    });
                }
            }

            suggestions.sort((a, b) => b.score - a.score);
            this.showSuggestions(suggestions);
        } catch (error) {
            console.error("Error getting suggestions:", error);
        }
    }

    showSuggestions(suggestions) {
        try {
            chrome.storage.local.set({
                suggestions: suggestions,
                suggestionTimestamp: Date.now(),
            });

            if (suggestions.length > 0) {
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "icons/icon48.png",
                    title: "Tab Suspend Pro",
                    message:
                        "Found " +
                        suggestions.length +
                        " tabs that can be suspended!",
                });
            } else {
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "icons/icon48.png",
                    title: "Tab Suspend Pro",
                    message: "No tabs found that need suspending!",
                });
            }
        } catch (error) {
            console.error("Error showing suggestions:", error);
        }
    }

    startMonitoring() {
        if (!this.settings.enabled) {
            return;
        }

        setInterval(async () => {
            await this.autoSuspendTabs();
        }, 60000);
    }

    async autoSuspendTabs() {
        if (!this.settings.enabled) {
            return;
        }

        try {
            const tabs = await chrome.tabs.query({});
            const now = Date.now();
            const suspendThreshold = this.settings.autoSuspendTime * 60 * 1000;

            for (const tab of tabs) {
                if (
                    tab.active ||
                    this.suspendedTabs.has(tab.id) ||
                    this.isWhitelisted(tab.url)
                ) {
                    continue;
                }

                if (
                    tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE &&
                    this.settings.excludedGroups.includes(tab.groupId)
                ) {
                    continue;
                }

                const lastActivity = this.tabActivity.get(tab.id) || now;
                const inactiveTime = now - lastActivity;

                if (inactiveTime > suspendThreshold) {
                    await this.suspendTab(tab.id);
                }
            }
        } catch (error) {
            console.error("Error in auto-suspend:", error);
        }
    }

    async restoreAllTabs() {
        try {
            const tabs = await chrome.tabs.query({});
            const restorePromises = tabs
                .filter((tab) => this.suspendedTabs.has(tab.id))
                .map((tab) => this.restoreTab(tab.id));

            await Promise.all(restorePromises);
            console.log("All suspended tabs restored");
        } catch (error) {
            console.error("Error restoring all tabs:", error);
        }
    }

    async restoreLostTabs() {
        try {
            if (!this.lostSuspended.length) {
                console.log("[RestoreLost] No lost suspended tabs to restore");
                return;
            }
            const toRestore = [...this.lostSuspended];
            this.lostSuspended = [];
            for (const meta of toRestore) {
                if (meta.originalUrl) {
                    await chrome.tabs.create({
                        url: meta.originalUrl,
                        active: false,
                    });
                }
            }
            await this.persistSuspendedMeta();
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon48.png",
                title: "Tab Suspend Pro",
                message: "Restored " + toRestore.length + " lost tabs",
            });
            console.log(
                "[RestoreLost] Restored",
                toRestore.length,
                "lost tabs"
            );
        } catch (e) {
            console.error("Error restoring lost tabs:", e);
        }
    }

    async addToWhitelist(url, type) {
        try {
            let urlToAdd = "";

            if (type === "url") {
                urlToAdd = url;
            } else if (type === "domain") {
                try {
                    const urlObj = new URL(url);
                    urlToAdd = urlObj.hostname;
                } catch (error) {
                    const match = url.match(
                        /(?:https?:\/\/)?(?:www\.)?([^\/]+)/
                    );
                    urlToAdd = match ? match[1] : url;
                }
            }

            if (urlToAdd && !this.settings.whitelistedUrls.includes(urlToAdd)) {
                this.settings.whitelistedUrls.push(urlToAdd);
                await this.saveSettings();

                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "icons/icon48.png",
                    title: "Tab Suspend Pro",
                    message: "Added to whitelist: " + urlToAdd,
                });

                console.log("Added to whitelist:", urlToAdd);
            }
        } catch (error) {
            console.error("Error adding to whitelist:", error);
        }
    }

    isWhitelisted(url) {
        try {
            const patterns = this.settings.whitelistedUrls || [];
            if (!patterns.length) return false;

            for (const raw of patterns) {
                if (!raw) continue;
                const pattern = raw.trim();
                if (!pattern) continue;

                // Wildcard pattern support e.g. https://*.example.com/*
                if (pattern.includes("*")) {
                    const regex = this._wildcardToRegex(pattern);
                    if (regex.test(url)) return true;
                    continue;
                }

                // Scheme-explicit simple prefix
                if (pattern.includes("://")) {
                    if (url.startsWith(pattern)) return true;
                    continue;
                }

                // Parse target URL
                let parsed;
                try {
                    parsed = new URL(url);
                } catch {
                    parsed = null;
                }
                if (!parsed) {
                    if (url.startsWith(pattern)) return true;
                    continue;
                }

                const host = parsed.hostname.toLowerCase();
                const path = parsed.pathname.toLowerCase();
                let p = pattern.toLowerCase();

                // localhost: (any port) pattern convenience
                if (p === "localhost:" || p === "127.0.0.1:") {
                    if (host === "localhost" || host === "127.0.0.1")
                        return true;
                    continue;
                }

                // Split domain + optional path
                let pDomain = p;
                let pPath = "";
                const slashIdx = p.indexOf("/");
                if (slashIdx !== -1) {
                    pDomain = p.slice(0, slashIdx);
                    pPath = p.slice(slashIdx); // retains leading /
                }

                if (pDomain.startsWith(".")) pDomain = pDomain.slice(1);

                const domainMatch =
                    host === pDomain || host.endsWith("." + pDomain);
                if (domainMatch) {
                    if (!pPath || path.startsWith(pPath)) return true;
                }

                // Fallback legacy prefix
                if (url.startsWith(pattern)) return true;
            }
            return false;
        } catch (e) {
            console.warn("Whitelist check error:", e);
            return false;
        }
    }

    _wildcardToRegex(pattern) {
        const escaped = pattern
            .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
            .replace(/\*/g, ".*");
        return new RegExp("^" + escaped + "$", "i");
    }

    estimateTabMemory(tab) {
        let baseEstimate = 30;

        if (tab.url.includes("youtube.com") || tab.url.includes("video")) {
            baseEstimate += 150;
        } else if (
            tab.url.includes("docs.google.com") ||
            tab.url.includes("office.com")
        ) {
            baseEstimate += 100;
        } else if (tab.url.includes("github.com")) {
            baseEstimate += 40;
        } else if (
            tab.url.includes("stackoverflow.com") ||
            tab.url.includes("reddit.com")
        ) {
            baseEstimate += 35;
        } else if (
            tab.url.includes("facebook.com") ||
            tab.url.includes("twitter.com")
        ) {
            baseEstimate += 80;
        } else if (
            tab.url.includes("gmail.com") ||
            tab.url.includes("outlook.com")
        ) {
            baseEstimate += 70;
        } else if (
            tab.url.includes("figma.com") ||
            tab.url.includes("canva.com")
        ) {
            baseEstimate += 120;
        } else if (
            tab.url.includes("netflix.com") ||
            tab.url.includes("hulu.com")
        ) {
            baseEstimate += 180;
        } else if (
            tab.url.includes("spotify.com") ||
            tab.url.includes("music")
        ) {
            baseEstimate += 60;
        } else if (
            tab.url.includes("discord.com") ||
            tab.url.includes("slack.com")
        ) {
            baseEstimate += 85;
        } else if (
            tab.url.includes("maps.google.com") ||
            tab.url.includes("maps")
        ) {
            baseEstimate += 110;
        }

        if (tab.title) {
            const title = tab.title.toLowerCase();
            if (title.includes("dashboard") || title.includes("admin")) {
                baseEstimate += 25;
            }
            if (title.includes("editor") || title.includes("ide")) {
                baseEstimate += 30;
            }
            if (title.includes("meeting") || title.includes("zoom")) {
                baseEstimate += 100;
            }
        }

        if (tab.audible) {
            baseEstimate += 50;
        }

        if (tab.pinned) {
            baseEstimate += 20;
        }

        return Math.min(baseEstimate, 300);
    }

    // Tab Groups Saving Feature
    async generateGroupId() {
        return (
            "group_" +
            Date.now() +
            "_" +
            Math.random().toString(36).substr(2, 9)
        );
    }

    async saveTabGroup(groupId = null, options = {}) {
        try {
            const { name, windowId, tabs: customTabs } = options;

            // If groupId is provided, get tabs from that group
            // If customTabs provided, use those
            // Otherwise, save all tabs in current window as a group
            let tabsToSave = [];
            let groupName = name || "";
            let groupColor = "grey";

            if (groupId && groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
                // Save existing tab group
                tabsToSave = await chrome.tabs.query({ groupId });
                try {
                    const group = await chrome.tabGroups.get(groupId);
                    groupName =
                        groupName ||
                        group.title ||
                        `Saved Group ${new Date().toLocaleDateString()}`;
                    groupColor = group.color || "grey";
                } catch (e) {
                    groupName =
                        groupName ||
                        `Saved Group ${new Date().toLocaleDateString()}`;
                }
            } else if (customTabs && customTabs.length > 0) {
                // Save custom set of tabs
                tabsToSave = customTabs;
                groupName =
                    groupName ||
                    `Custom Group ${new Date().toLocaleDateString()}`;
            } else {
                // Save current window as group
                const currentWindow =
                    windowId || (await chrome.windows.getCurrent()).id;
                tabsToSave = await chrome.tabs.query({
                    windowId: currentWindow,
                });
                groupName =
                    groupName ||
                    `Window Group ${new Date().toLocaleDateString()}`;
            }

            if (!tabsToSave || tabsToSave.length === 0) {
                throw new Error("No tabs to save");
            }

            // Filter out extension pages and about: pages
            const validTabs = tabsToSave.filter(
                (tab) =>
                    tab.url &&
                    !tab.url.startsWith("chrome://") &&
                    !tab.url.startsWith("chrome-extension://") &&
                    !tab.url.startsWith("about:") &&
                    !tab.url.startsWith("edge://") &&
                    !tab.url.includes("suspended.html")
            );

            if (validTabs.length === 0) {
                throw new Error(
                    "No valid tabs to save (filtered out extension and system pages)"
                );
            }

            const savedGroup = {
                id: await this.generateGroupId(),
                name: groupName,
                color: groupColor,
                createdAt: Date.now(),
                tabCount: validTabs.length,
                tabs: validTabs.map((tab) => ({
                    url: tab.url,
                    title: tab.title || "",
                    favicon: tab.favIconUrl || "",
                    pinned: tab.pinned || false,
                    active: tab.active || false,
                    index: tab.index || 0,
                })),
                windowBounds: null, // Could store window size/position if needed
            };

            // Get existing saved groups
            const stored = await chrome.storage.local.get(["savedTabGroups"]);
            const savedGroups = stored.savedTabGroups || {};

            // Add new group
            savedGroups[savedGroup.id] = savedGroup;

            // Save to storage
            await chrome.storage.local.set({ savedTabGroups: savedGroups });

            // Show notification
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon48.png",
                title: "Tab Suspend Pro",
                message: `Saved "${groupName}" with ${validTabs.length} tabs`,
            });

            console.log(
                `[SaveGroup] Saved group "${groupName}" with ${validTabs.length} tabs`
            );
            return savedGroup;
        } catch (error) {
            console.error("Error saving tab group:", error);
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon48.png",
                title: "Tab Suspend Pro",
                message: `Error saving group: ${error.message}`,
            });
            throw error;
        }
    }

    async listSavedGroups() {
        try {
            const stored = await chrome.storage.local.get(["savedTabGroups"]);
            const savedGroups = stored.savedTabGroups || {};
            return Object.values(savedGroups).sort(
                (a, b) => b.createdAt - a.createdAt
            );
        } catch (error) {
            console.error("Error listing saved groups:", error);
            return [];
        }
    }

    async getSavedGroup(groupId) {
        try {
            const stored = await chrome.storage.local.get(["savedTabGroups"]);
            const savedGroups = stored.savedTabGroups || {};
            return savedGroups[groupId] || null;
        } catch (error) {
            console.error("Error getting saved group:", error);
            return null;
        }
    }

    async restoreSavedGroup(groupId, options = {}) {
        try {
            const { newWindow = false, activateTabIndex = 0 } = options;
            const savedGroup = await this.getSavedGroup(groupId);

            if (!savedGroup) {
                throw new Error("Saved group not found");
            }

            const { tabs, name, color } = savedGroup;
            let targetWindowId = null;
            let createdTabs = [];

            // Determine target window
            if (newWindow) {
                const newWin = await chrome.windows.create({
                    url: tabs[0].url,
                    focused: true,
                });
                targetWindowId = newWin.id;
                createdTabs.push(newWin.tabs[0]);

                // Create remaining tabs
                for (let i = 1; i < tabs.length; i++) {
                    const tab = tabs[i];
                    const createdTab = await chrome.tabs.create({
                        windowId: targetWindowId,
                        url: tab.url,
                        pinned: tab.pinned,
                        active: false,
                    });
                    createdTabs.push(createdTab);
                }
            } else {
                // Restore to current window
                const currentWindow = await chrome.windows.getCurrent();
                targetWindowId = currentWindow.id;

                for (const tab of tabs) {
                    const createdTab = await chrome.tabs.create({
                        windowId: targetWindowId,
                        url: tab.url,
                        pinned: tab.pinned,
                        active: false,
                    });
                    createdTabs.push(createdTab);
                }
            }

            // Group the restored tabs if there are multiple
            if (createdTabs.length > 1) {
                try {
                    const tabIds = createdTabs.map((t) => t.id);
                    const groupId = await chrome.tabs.group({ tabIds });
                    await chrome.tabGroups.update(groupId, {
                        title: name,
                        color: color || "grey",
                    });
                    console.log(
                        `[RestoreGroup] Created group "${name}" with ${createdTabs.length} tabs`
                    );
                } catch (groupError) {
                    console.warn(
                        "Could not create tab group after restore:",
                        groupError
                    );
                }
            }

            // Activate requested tab
            if (
                activateTabIndex >= 0 &&
                activateTabIndex < createdTabs.length
            ) {
                await chrome.tabs.update(createdTabs[activateTabIndex].id, {
                    active: true,
                });
            } else if (createdTabs.length > 0) {
                await chrome.tabs.update(createdTabs[0].id, { active: true });
            }

            // Update activity for restored tabs
            for (const tab of createdTabs) {
                this.updateTabActivity(tab.id);
            }

            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon48.png",
                title: "Tab Suspend Pro",
                message: `Restored "${name}" with ${createdTabs.length} tabs`,
            });

            return {
                success: true,
                tabs: createdTabs,
                groupId:
                    createdTabs.length > 1
                        ? await chrome.tabs
                              .query({ windowId: targetWindowId })
                              .then(
                                  (tabs) =>
                                      tabs.find((t) =>
                                          createdTabs.some(
                                              (ct) => ct.id === t.id
                                          )
                                      )?.groupId
                              )
                        : null,
            };
        } catch (error) {
            console.error("Error restoring saved group:", error);
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon48.png",
                title: "Tab Suspend Pro",
                message: `Error restoring group: ${error.message}`,
            });
            throw error;
        }
    }

    async deleteSavedGroup(groupId) {
        try {
            const stored = await chrome.storage.local.get(["savedTabGroups"]);
            const savedGroups = stored.savedTabGroups || {};

            if (!savedGroups[groupId]) {
                throw new Error("Group not found");
            }

            const groupName = savedGroups[groupId].name;
            delete savedGroups[groupId];

            await chrome.storage.local.set({ savedTabGroups: savedGroups });

            console.log(`[DeleteGroup] Deleted group "${groupName}"`);
            return { success: true };
        } catch (error) {
            console.error("Error deleting saved group:", error);
            throw error;
        }
    }

    async exportSavedGroups() {
        try {
            const groups = await this.listSavedGroups();
            const exportData = {
                version: "1.0",
                exportedAt: Date.now(),
                groups: groups,
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);

            await chrome.downloads.download({
                url: url,
                filename: `tab-suspend-pro-groups-${
                    new Date().toISOString().split("T")[0]
                }.json`,
                saveAs: true,
            });

            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon48.png",
                title: "Tab Suspend Pro",
                message: `Exported ${groups.length} saved groups`,
            });

            return { success: true, count: groups.length };
        } catch (error) {
            console.error("Error exporting saved groups:", error);
            throw error;
        }
    }

    async importSavedGroups(fileContent, mergeMode = true) {
        try {
            const importData = JSON.parse(fileContent);

            if (!importData.groups || !Array.isArray(importData.groups)) {
                throw new Error("Invalid import file format");
            }

            const stored = await chrome.storage.local.get(["savedTabGroups"]);
            let savedGroups = mergeMode ? stored.savedTabGroups || {} : {};

            let importedCount = 0;
            let duplicateCount = 0;

            for (const group of importData.groups) {
                if (!group.id || !group.name || !group.tabs) continue;

                // Check for duplicates by name and tab count
                const isDuplicate = Object.values(savedGroups).some(
                    (existing) =>
                        existing.name === group.name &&
                        existing.tabCount === group.tabCount
                );

                if (isDuplicate && mergeMode) {
                    duplicateCount++;
                    continue; // Skip duplicates in merge mode
                }

                // Generate new ID to avoid conflicts
                const newId = await this.generateGroupId();
                savedGroups[newId] = {
                    ...group,
                    id: newId,
                    importedAt: Date.now(),
                };
                importedCount++;
            }

            await chrome.storage.local.set({ savedTabGroups: savedGroups });

            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon48.png",
                title: "Tab Suspend Pro",
                message: `Imported ${importedCount} groups${
                    duplicateCount > 0
                        ? `, skipped ${duplicateCount} duplicates`
                        : ""
                }`,
            });

            return {
                success: true,
                imported: importedCount,
                duplicates: duplicateCount,
            };
        } catch (error) {
            console.error("Error importing saved groups:", error);
            throw error;
        }
    }
}

const tabSuspendManager = new TabSuspendManager();
