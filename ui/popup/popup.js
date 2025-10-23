// Popup script for BrowserGuard Pro
class PopupManager {
    constructor() {
        this.settings = {};
        this.stats = { suspended: 0, memorySaved: 0 };
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadTheme(); // Load theme before updating UI
        this.setupTabInterface(); // Setup UI structure first
        await this.updateStats();
        await this.loadTabGroups();
        this.updateExtensionState(); // Check if extension is enabled

        // Load data for enabled features
        const hasAnyAdvancedFeatures =
            this.settings.savedGroupsEnabled ||
            this.settings.sessionsEnabled ||
            this.settings.analyticsEnabled ||
            this.settings.organizationEnabled;

        if (hasAnyAdvancedFeatures) {
            await this.ensureBackgroundReady();

            // Load saved groups if the feature is enabled
            if (this.settings.savedGroupsEnabled) {
                await this.loadSavedGroups();
            }
        }

        this.setupEventListeners();
        this.updateUI();
        await this.checkForSuggestions();
    }

    updateExtensionState() {
        const isEnabled = this.settings.extensionEnabled !== false;
        const toggle = document.getElementById("toggle");
        const content = document.querySelector(".content");
        const statusText = document.getElementById("status-text");

        if (toggle) {
            toggle.classList.toggle("active", isEnabled);
        }

        if (content) {
            content.classList.toggle("extension-disabled", !isEnabled);
        }

        if (statusText) {
            statusText.textContent = isEnabled
                ? "Extension Enabled"
                : "Extension Disabled";
        }

        // Update all action buttons
        const actionButtons = document.querySelectorAll(".btn");
        actionButtons.forEach((btn) => {
            btn.disabled = !isEnabled;
            if (!isEnabled) {
                btn.style.pointerEvents = "none";
            } else {
                btn.style.pointerEvents = "auto";
            }
        });
    }

    async ensureBackgroundReady() {
        try {
            // Send a simple ping to test the connection
            const response = await chrome.runtime.sendMessage({
                action: "ping",
            });
            console.log("Background script ready:", response);
        } catch (error) {
            console.warn("Background script not ready, waiting...", error);
            // Wait a bit and try again
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                "tabSuspendSettings",
                "extensionEnabled",
            ]);
            this.settings = result.tabSuspendSettings || { enabled: true };
            // Add extensionEnabled setting separately for backward compatibility
            this.settings.extensionEnabled = result.extensionEnabled !== false;
        } catch (error) {
            console.error("Error loading settings:", error);
            this.settings = { enabled: true, extensionEnabled: true };
        }
    }

    async loadTheme() {
        try {
            const result = await chrome.storage.sync.get(["theme"]);
            const theme = result.theme || "light";
            this.currentTheme = theme;
            this.applyTheme(theme);
        } catch (error) {
            console.error("Error loading theme:", error);
            this.currentTheme = "light";
        }
    }

    applyTheme(theme) {
        const body = document.body;
        const themeToggle = document.getElementById("theme-toggle");

        if (theme === "dark") {
            body.setAttribute("data-theme", "dark");
            if (themeToggle) themeToggle.textContent = "☀️";
        } else {
            body.removeAttribute("data-theme");
            if (themeToggle) themeToggle.textContent = "🌙";
        }
    }

    async toggleTheme() {
        const newTheme = this.currentTheme === "light" ? "dark" : "light";
        this.currentTheme = newTheme;
        this.applyTheme(newTheme);

        try {
            await chrome.storage.sync.set({ theme: newTheme });
        } catch (error) {
            console.error("Error saving theme:", error);
        }
    }

    async loadTabGroups() {
        try {
            const groups = await chrome.tabGroups.query({});
            const tabs = await chrome.tabs.query({});
            this.tabGroups = groups;
            this.populateCombinedGroupDropdown(groups, tabs);
        } catch (error) {
            console.error("Error loading tab groups:", error);
        }
    }

    async populateCombinedGroupDropdown(groups, tabs) {
        const dropdown = document.getElementById("combined-group-dropdown");
        if (!dropdown) return; // Element doesn't exist yet

        dropdown.innerHTML = "";

        if (groups.length === 0) {
            dropdown.innerHTML =
                '<option value="">No tab groups found</option>';
            this.updateGroupActionButtons(null);
            return;
        }

        dropdown.innerHTML = '<option value="">Select a tab group...</option>';

        groups.forEach((group) => {
            const groupTabs = tabs.filter((tab) => tab.groupId === group.id);
            const suspendedCount = groupTabs.filter(
                (tab) => tab.url && tab.url.includes("suspended.html")
            ).length;
            const totalCount = groupTabs.length;

            const option = document.createElement("option");
            option.value = group.id;
            option.dataset.suspendedCount = suspendedCount;
            option.dataset.totalCount = totalCount;

            let statusText = "";
            if (suspendedCount === 0) {
                statusText = ` (${totalCount} active)`;
            } else if (suspendedCount === totalCount) {
                statusText = ` (${totalCount} suspended)`;
            } else {
                statusText = ` (${suspendedCount}/${totalCount} suspended)`;
            }

            option.textContent =
                (group.title || `Unnamed Group ${group.id}`) + statusText;
            dropdown.appendChild(option);
        });
    }

    updateGroupActionButtons(selectedOption) {
        const suspendBtn = document.getElementById("suspend-group-btn");
        const restoreBtn = document.getElementById("restore-group-btn");

        if (!suspendBtn || !restoreBtn) return; // Elements don't exist yet

        if (!selectedOption || selectedOption.value === "") {
            suspendBtn.style.display = "none";
            restoreBtn.style.display = "none";
            return;
        }

        const suspendedCount =
            parseInt(selectedOption.dataset.suspendedCount) || 0;
        const totalCount = parseInt(selectedOption.dataset.totalCount) || 0;

        if (suspendedCount === 0) {
            suspendBtn.style.display = "block";
            restoreBtn.style.display = "none";
            suspendBtn.textContent = `Suspend Group (${totalCount} tabs)`;
        } else if (suspendedCount === totalCount) {
            suspendBtn.style.display = "none";
            restoreBtn.style.display = "block";
            restoreBtn.textContent = `Restore Group (${totalCount} tabs)`;
        } else {
            suspendBtn.style.display = "block";
            restoreBtn.style.display = "block";
            suspendBtn.textContent = `Suspend Remaining (${
                totalCount - suspendedCount
            })`;
            restoreBtn.textContent = `Restore Suspended (${suspendedCount})`;
        }
    }

    async updateStats() {
        try {
            const tabs = await chrome.tabs.query({});
            let suspendedCount = 0;
            let memorySaved = 0;

            for (const tab of tabs) {
                if (tab.url && tab.url.includes("suspended.html")) {
                    suspendedCount++;
                    memorySaved += this.estimateTabMemory(tab);
                }
            }

            this.stats = { suspended: suspendedCount, memorySaved };
        } catch (error) {
            console.error("Error updating stats:", error);
        }
    }

    setupEventListeners() {
        // Extension toggle
        const extensionToggle = document.getElementById("toggle");
        if (extensionToggle) {
            extensionToggle.addEventListener("click", async () => {
                const newState = !this.settings.extensionEnabled;
                this.settings.extensionEnabled = newState;
                await chrome.storage.sync.set({ extensionEnabled: newState });
                this.updateExtensionState();

                // Notify background script about state change
                chrome.runtime.sendMessage({
                    action: "toggleExtension",
                    enabled: newState,
                });
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById("theme-toggle");
        if (themeToggle) {
            themeToggle.addEventListener("click", () => this.toggleTheme());
        }

        // Toggle extension
        const toggle = document.getElementById("toggle");
        if (toggle) {
            toggle.addEventListener("click", async () => {
                this.settings.enabled = !this.settings.enabled;
                await chrome.storage.sync.set({
                    tabSuspendSettings: this.settings,
                });
                this.updateUI();
            });
        }

        // Settings button
        const settingsBtn = document.getElementById("settings-btn");
        if (settingsBtn) {
            settingsBtn.addEventListener("click", () => {
                if (this.settings.enabled) {
                    chrome.runtime.openOptionsPage();
                }
            });
        }

        // Suspend current tab
        const suspendCurrent = document.getElementById("suspend-current");
        if (suspendCurrent) {
            suspendCurrent.addEventListener("click", async () => {
                if (!this.settings.enabled) return;

                const [tab] = await chrome.tabs.query({
                    active: true,
                    currentWindow: true,
                });
                await this.sendMessageToBackground("suspendTab", {
                    tabId: tab.id,
                });
                setTimeout(() => this.updateStats(), 500);
            });
        }

        // Suggest tabs
        const suggestTabs = document.getElementById("suggest-tabs");
        if (suggestTabs) {
            suggestTabs.addEventListener("click", async () => {
                if (!this.settings.enabled) return;

                await this.sendMessageToBackground("suggestTabs");
                setTimeout(() => this.checkForSuggestions(), 500);
            });
        }

        // Restore all tabs
        const restoreAll = document.getElementById("restore-all");
        if (restoreAll) {
            restoreAll.addEventListener("click", async () => {
                if (!this.settings.enabled) return;

                await this.sendMessageToBackground("restoreAllTabs");
                setTimeout(() => this.updateStats(), 500);
            });
        }

        // Restore lost tabs
        const restoreLost = document.getElementById("restore-lost");
        if (restoreLost) {
            restoreLost.addEventListener("click", async () => {
                if (!this.settings.enabled) return;
                await this.sendMessageToBackground("restoreLostTabs");
                setTimeout(() => this.updateStats(), 800);
            });
        }

        // Toggle combined group selector
        const toggleGroupSelector = document.getElementById(
            "toggle-combined-group-selector"
        );
        if (toggleGroupSelector) {
            toggleGroupSelector.addEventListener("click", () => {
                if (!this.settings.enabled) return;

                const selector = document.getElementById(
                    "combined-group-selector"
                );
                if (selector) {
                    const isVisible = selector.style.display !== "none";
                    selector.style.display = isVisible ? "none" : "block";

                    if (!isVisible) {
                        this.loadTabGroups();
                    }
                }
            });
        }

        // Group dropdown change
        const groupDropdown = document.getElementById(
            "combined-group-dropdown"
        );
        if (groupDropdown) {
            groupDropdown.addEventListener("change", (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                this.updateGroupActionButtons(selectedOption);
            });
        }

        // Suspend group button
        const suspendGroupBtn = document.getElementById("suspend-group-btn");
        if (suspendGroupBtn) {
            suspendGroupBtn.addEventListener("click", async () => {
                if (!this.settings.enabled) return;

                const dropdown = document.getElementById(
                    "combined-group-dropdown"
                );
                if (dropdown) {
                    const selectedGroupId = dropdown.value;

                    if (selectedGroupId) {
                        await this.sendMessageToBackground("suspendTabGroup", {
                            groupId: parseInt(selectedGroupId),
                        });
                        setTimeout(() => {
                            this.updateStats();
                            this.loadTabGroups();
                        }, 500);
                    }
                }
            });
        }

        // Restore group button
        const restoreGroupBtn = document.getElementById("restore-group-btn");
        if (restoreGroupBtn) {
            restoreGroupBtn.addEventListener("click", async () => {
                if (!this.settings.enabled) return;

                const dropdown = document.getElementById(
                    "combined-group-dropdown"
                );
                if (dropdown) {
                    const selectedGroupId = dropdown.value;

                    if (selectedGroupId) {
                        await this.sendMessageToBackground("restoreTabGroup", {
                            groupId: parseInt(selectedGroupId),
                        });
                        setTimeout(() => {
                            this.updateStats();
                            this.loadTabGroups();
                        }, 500);
                    }
                }
            });
        }

        // Never suspend URL button
        const neverSuspendUrl = document.getElementById("never-suspend-url");
        if (neverSuspendUrl) {
            neverSuspendUrl.addEventListener("click", async () => {
                if (!this.settings.enabled) return;

                const [tab] = await chrome.tabs.query({
                    active: true,
                    currentWindow: true,
                });
                await this.sendMessageToBackground("addToWhitelist", {
                    url: tab.url,
                    type: "url",
                });
            });
        }

        // Never suspend domain button
        const neverSuspendDomain = document.getElementById(
            "never-suspend-domain"
        );
        if (neverSuspendDomain) {
            neverSuspendDomain.addEventListener("click", async () => {
                if (!this.settings.enabled) return;

                const [tab] = await chrome.tabs.query({
                    active: true,
                    currentWindow: true,
                });
                await this.sendMessageToBackground("addToWhitelist", {
                    url: tab.url,
                    type: "domain",
                });
            });
        }

        // Tracker Blocker button
        const trackerBlockerBtn = document.getElementById(
            "tracker-blocker-btn"
        );
        if (trackerBlockerBtn) {
            trackerBlockerBtn.addEventListener("click", () => {
                chrome.tabs.create({
                    url: chrome.runtime.getURL(
                        "ui/dashboards/tracker-blocker/tracker-dashboard.html"
                    ),
                });
            });
        }

        // Ads Blocker button
        const adsBlockerBtn = document.getElementById("ads-blocker-btn");
        if (adsBlockerBtn) {
            adsBlockerBtn.addEventListener("click", () => {
                chrome.tabs.create({
                    url: chrome.runtime.getURL(
                        "ui/dashboards/ads-blocker/ads-dashboard.html"
                    ),
                });
            });
        }

        // Settings button (bottom)
        const openSettings = document.getElementById("open-settings");
        if (openSettings) {
            openSettings.addEventListener("click", () => {
                if (this.settings.enabled) {
                    chrome.runtime.openOptionsPage();
                }
            });
        }

        // Saved Groups functionality
        const saveCurrentGroup = document.getElementById("save-current-group");
        if (saveCurrentGroup) {
            saveCurrentGroup.addEventListener("click", async () => {
                if (!this.settings.enabled) return;
                await this.saveCurrentGroupOrWindow();
            });
        }

        // Saved groups list event delegation
        const savedGroupsList = document.getElementById(
            "popup-saved-groups-list"
        );
        if (savedGroupsList) {
            savedGroupsList.addEventListener("click", async (e) => {
                if (!this.settings.enabled) return;

                const groupId = e.target.dataset.groupId;
                const action = e.target.dataset.action;

                if (groupId && action) {
                    await this.handleSavedGroupAction(groupId, action);
                }
            });
        }

        // Tab interface event listeners
        const tabButtons = document.querySelectorAll(".tab-button");
        tabButtons.forEach((button) => {
            button.addEventListener("click", (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // New Advanced Features Event Listeners
        this.setupAdvancedEventListeners();
    }

    updateUI() {
        const toggle = document.getElementById("toggle");
        const statusText = document.getElementById("status-text");
        const settingsBtn = document.getElementById("settings-btn");

        if (toggle && statusText) {
            if (this.settings.enabled) {
                toggle.classList.add("active");
                statusText.textContent = "Extension Enabled";
            } else {
                toggle.classList.remove("active");
                statusText.textContent = "Extension Disabled";
            }
        }

        if (settingsBtn) {
            if (this.settings.enabled) {
                settingsBtn.classList.remove("disabled");
            } else {
                settingsBtn.classList.add("disabled");
            }
        }

        const suspendedCount = document.getElementById("suspended-count");
        const memorySaved = document.getElementById("memory-saved");

        if (suspendedCount) suspendedCount.textContent = this.stats.suspended;
        if (memorySaved)
            memorySaved.textContent = `${this.stats.memorySaved}MB`;

        this.updateButtonStates();
    }

    updateButtonStates() {
        const buttons = [
            "suspend-current",
            "suggest-tabs",
            "restore-all",
            "restore-lost",
            "toggle-combined-group-selector",
            "suspend-group-btn",
            "restore-group-btn",
            "never-suspend-url",
            "never-suspend-domain",
            "open-settings",
        ];

        buttons.forEach((buttonId) => {
            const button = document.getElementById(buttonId);
            if (button) {
                if (this.settings.enabled) {
                    button.classList.remove("disabled");
                    button.style.opacity = "1";
                    button.style.cursor = "pointer";
                    button.disabled = false;
                } else {
                    button.classList.add("disabled");
                    button.style.opacity = "0.5";
                    button.style.cursor = "not-allowed";
                    button.disabled = true;
                }
            }
        });

        const selector = document.getElementById("combined-group-selector");
        const dropdown = document.getElementById("combined-group-dropdown");
        if (selector && dropdown) {
            if (this.settings.enabled) {
                dropdown.disabled = false;
                dropdown.style.opacity = "1";
            } else {
                dropdown.disabled = true;
                dropdown.style.opacity = "0.5";
                selector.style.display = "none";
            }
        }
    }

    async checkForSuggestions() {
        try {
            const result = await chrome.storage.local.get([
                "suggestions",
                "suggestionTimestamp",
            ]);
            const suggestions = result.suggestions || [];
            const timestamp = result.suggestionTimestamp || 0;

            if (
                suggestions.length > 0 &&
                Date.now() - timestamp < 5 * 60 * 1000
            ) {
                this.displaySuggestions(suggestions.slice(0, 5));
            }
        } catch (error) {
            console.error("Error checking suggestions:", error);
        }
    }

    displaySuggestions(suggestions) {
        const suggestionsDiv = document.getElementById("suggestions");
        const suggestionList = document.getElementById("suggestion-list");

        if (!suggestionsDiv || !suggestionList) return;

        if (suggestions.length === 0) {
            suggestionsDiv.style.display = "none";
            return;
        }

        suggestionList.innerHTML = "";

        suggestions.forEach((suggestion) => {
            const item = document.createElement("div");
            item.className = "suggestion-item";

            item.innerHTML = `
        <img class="suggestion-favicon" src="${
            suggestion.favicon ||
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMkw4Ljc3IDYuMTdMMTMgN0w4Ljc3IDEwLjgzTDggMTRMNy4yMyAxMC44M0wzIDdMNy4yMyA2LjE3TDggMloiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4="
        }" alt="">
        <div class="suggestion-info">
          <div class="suggestion-title">${suggestion.title}</div>
          <div class="suggestion-meta">${
              suggestion.inactiveTime
          }min inactive • ~${suggestion.memoryEstimate}MB</div>
        </div>
        <div class="suggestion-actions">
          <button class="btn btn-primary btn-small" onclick="suspendSuggestedTab(${
              suggestion.id
          })">Suspend</button>
        </div>
      `;

            suggestionList.appendChild(item);
        });

        suggestionsDiv.style.display = "block";
    }

    async sendMessageToBackground(action, data = {}) {
        const maxAttempts = 5;
        const baseDelay = 120; // ms
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                await chrome.runtime.sendMessage({ action, ...data });
                return true;
            } catch (error) {
                const msg = error && (error.message || String(error));
                const isNoReceiver = /Receiving end does not exist/i.test(msg);
                const isDisconnected =
                    /disconnected|Extension context invalid/i.test(msg);
                if (
                    (isNoReceiver || isDisconnected) &&
                    attempt < maxAttempts - 1
                ) {
                    // Exponential backoff
                    const delay = baseDelay * Math.pow(2, attempt);
                    await new Promise((r) => setTimeout(r, delay));
                    // Light ping to help spin up service worker
                    try {
                        await chrome.storage.local.get("suspendedTabState");
                    } catch {}
                    continue;
                }
                console.error(
                    `Error sending message to background (attempt ${
                        attempt + 1
                    }/${maxAttempts}):`,
                    error
                );
                return false;
            }
        }
        return false;
    }

    estimateTabMemory(tab) {
        let estimate = 30;

        if (tab.url) {
            if (tab.url.includes("youtube.com") || tab.url.includes("video")) {
                estimate += 150;
            } else if (
                tab.url.includes("docs.google.com") ||
                tab.url.includes("office.com")
            ) {
                estimate += 100;
            } else if (tab.url.includes("github.com")) {
                estimate += 40;
            } else if (
                tab.url.includes("stackoverflow.com") ||
                tab.url.includes("reddit.com")
            ) {
                estimate += 35;
            } else if (
                tab.url.includes("facebook.com") ||
                tab.url.includes("twitter.com") ||
                tab.url.includes("linkedin.com")
            ) {
                estimate += 80;
            } else if (
                tab.url.includes("gmail.com") ||
                tab.url.includes("outlook.com")
            ) {
                estimate += 70;
            } else if (
                tab.url.includes("atlassian.net") ||
                tab.url.includes("jira") ||
                tab.url.includes("confluence")
            ) {
                estimate += 90;
            } else if (
                tab.url.includes("figma.com") ||
                tab.url.includes("canva.com")
            ) {
                estimate += 120;
            } else if (
                tab.url.includes("netflix.com") ||
                tab.url.includes("hulu.com") ||
                tab.url.includes("primevideo.com")
            ) {
                estimate += 180;
            } else if (
                tab.url.includes("spotify.com") ||
                tab.url.includes("music")
            ) {
                estimate += 60;
            } else if (
                tab.url.includes("discord.com") ||
                tab.url.includes("slack.com")
            ) {
                estimate += 85;
            } else if (
                tab.url.includes("maps.google.com") ||
                tab.url.includes("maps")
            ) {
                estimate += 110;
            }
        }

        if (tab.title) {
            const title = tab.title.toLowerCase();
            if (title.includes("dashboard") || title.includes("admin")) {
                estimate += 25;
            }
            if (title.includes("editor") || title.includes("ide")) {
                estimate += 30;
            }
            if (
                title.includes("meeting") ||
                title.includes("zoom") ||
                title.includes("teams")
            ) {
                estimate += 100;
            }
        }

        if (tab.audible) {
            estimate += 50;
        }

        if (tab.pinned) {
            estimate += 20;
        }

        return Math.min(estimate, 300);
    }

    // Tab Interface Methods
    setupTabInterface() {
        const tabContainer = document.getElementById("tab-container");
        const content = document.querySelector(".content");

        // Check if any advanced features are enabled
        const hasAnyAdvancedFeatures =
            this.settings.savedGroupsEnabled ||
            this.settings.sessionsEnabled ||
            this.settings.analyticsEnabled ||
            this.settings.organizationEnabled;

        if (hasAnyAdvancedFeatures) {
            // Show tab interface
            tabContainer.style.display = "block";
            content.classList.add("has-tabs");

            // Show/hide individual tabs based on settings
            this.updateTabVisibility();
        } else {
            // Hide tab interface
            tabContainer.style.display = "none";
            content.classList.remove("has-tabs");

            // Show suspend content directly
            const suspendContent = document.getElementById("content-suspend");
            if (suspendContent) suspendContent.classList.add("active");

            // Hide other content
            document
                .querySelectorAll(".tab-content:not(#content-suspend)")
                .forEach((content) => {
                    content.classList.remove("active");
                });
        }
    }

    updateTabVisibility() {
        // Show/hide individual tab buttons based on settings
        const tabSessions = document.getElementById("tab-sessions");
        const tabAnalytics = document.getElementById("tab-analytics");
        const tabOrganization = document.getElementById("tab-organization");
        const tabSavedGroups = document.getElementById("tab-saved-groups");

        if (tabSessions) {
            tabSessions.style.display = this.settings.sessionsEnabled
                ? "block"
                : "none";
        }
        if (tabAnalytics) {
            tabAnalytics.style.display = this.settings.analyticsEnabled
                ? "block"
                : "none";
        }
        if (tabOrganization) {
            tabOrganization.style.display = this.settings.organizationEnabled
                ? "block"
                : "none";
        }
        if (tabSavedGroups) {
            tabSavedGroups.style.display = this.settings.savedGroupsEnabled
                ? "block"
                : "none";
        }

        // If the currently active tab is hidden, switch to suspend tab
        const activeTab = document.querySelector(".tab-button.active");
        if (activeTab && activeTab.style.display === "none") {
            this.switchTab("suspend");
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll(".tab-button").forEach((btn) => {
            btn.classList.remove("active");
        });
        document
            .querySelector(`[data-tab="${tabName}"]`)
            .classList.add("active");

        // Update tab content
        document.querySelectorAll(".tab-content").forEach((content) => {
            content.classList.remove("active");
        });
        document.getElementById(`content-${tabName}`).classList.add("active");

        // Load data for specific tabs
        switch (tabName) {
            case "saved-groups":
                if (this.settings.savedGroupsEnabled) {
                    this.loadSavedGroups();
                }
                break;
            case "sessions":
                this.loadSessionsData();
                break;
            case "analytics":
                this.loadAnalyticsData();
                break;
            case "organization":
                this.loadOrganizationData();
                break;
        }
    }

    // Saved Groups Methods
    async loadSavedGroups() {
        try {
            // Check if saved groups feature is enabled
            if (!this.settings.savedGroupsEnabled) {
                console.log("Saved groups feature is disabled, skipping load");
                return;
            }

            console.log("Loading saved groups...");

            // Retry mechanism for background script connection
            let response = null;
            let retries = 3;

            while (retries > 0 && !response) {
                try {
                    response = await chrome.runtime.sendMessage({
                        action: "listSavedGroups",
                    });
                    break;
                } catch (error) {
                    retries--;
                    if (retries > 0) {
                        console.log(
                            `Retrying to connect to background script... (${retries} attempts left)`
                        );
                        await new Promise((resolve) =>
                            setTimeout(resolve, 100)
                        );
                    } else {
                        throw error;
                    }
                }
            }

            if (!response) {
                console.error(
                    "No response from background script after retries"
                );
                this.renderPopupSavedGroups([]);
                return;
            }

            const groups = response.success ? response.groups : [];
            console.log("Loaded saved groups:", groups.length);
            this.renderPopupSavedGroups(groups.slice(0, 3)); // Show only first 3 groups
        } catch (error) {
            console.error("Error loading saved groups:", error);
            // Only show empty state if the container exists (feature is enabled)
            if (this.settings.savedGroupsEnabled) {
                this.renderPopupSavedGroups([]);
            }
        }
    }

    renderPopupSavedGroups(groups) {
        const container = document.getElementById("popup-saved-groups-list");
        if (!container) return;

        if (!groups || groups.length === 0) {
            container.innerHTML = `
                <div class="popup-saved-groups-empty">
                    💾 No saved groups yet<br>
                    <small>Save your first group to see it here</small>
                </div>
            `;
            return;
        }

        container.innerHTML = groups
            .map((group) => {
                const createdDate = new Date(
                    group.createdAt
                ).toLocaleDateString();
                return `
                <div class="popup-saved-group-item">
                    <div class="popup-group-info">
                        <div class="popup-group-name">${this.escapeHtml(
                            group.name
                        )}</div>
                        <div class="popup-group-meta">${
                            group.tabCount
                        } tabs • ${createdDate}</div>
                    </div>
                    <div class="popup-group-actions">
                        <button class="btn-small btn-restore-small" data-group-id="${
                            group.id
                        }" data-action="restore">
                            Restore
                        </button>
                    </div>
                </div>
            `;
            })
            .join("");
    }

    async saveCurrentGroupOrWindow() {
        try {
            const [activeTab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            let groupId = null;
            let groupName = "";

            if (activeTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
                // Save the current tab group
                groupId = activeTab.groupId;
                try {
                    const group = await chrome.tabGroups.get(groupId);
                    groupName =
                        group.title ||
                        `Group ${new Date().toLocaleDateString()}`;
                } catch (e) {
                    groupName = `Group ${new Date().toLocaleDateString()}`;
                }
            } else {
                // Save current window
                groupName = `Window ${new Date().toLocaleDateString()}`;
            }

            const response = await chrome.runtime.sendMessage({
                action: "saveTabGroup",
                groupId: groupId,
                options: { name: groupName, windowId: activeTab.windowId },
            });

            if (response.success) {
                await this.loadSavedGroups();
                this.showPopupMessage(`Saved "${groupName}"!`, "success");
            } else {
                this.showPopupMessage("Failed to save group", "error");
            }
        } catch (error) {
            console.error("Error saving group:", error);
            this.showPopupMessage("Error saving group", "error");
        }
    }

    async handleSavedGroupAction(groupId, action) {
        try {
            switch (action) {
                case "restore":
                    const response = await chrome.runtime.sendMessage({
                        action: "restoreSavedGroup",
                        groupId: groupId,
                        options: { newWindow: false },
                    });
                    if (response.success) {
                        this.showPopupMessage("Group restored!", "success");
                        setTimeout(() => {
                            this.updateStats();
                        }, 500);
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error with action ${action}:`, error);
            this.showPopupMessage(`Error: ${error.message}`, "error");
        }
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    showPopupMessage(message, type) {
        // Create a temporary message element if it doesn't exist
        let messageEl = document.getElementById("popup-message");
        if (!messageEl) {
            messageEl = document.createElement("div");
            messageEl.id = "popup-message";
            messageEl.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 0.8rem;
                font-weight: 500;
                z-index: 1000;
                transition: opacity 0.3s;
            `;
            document.body.appendChild(messageEl);
        }

        messageEl.textContent = message;
        messageEl.className =
            type === "success"
                ? "popup-message-success"
                : "popup-message-error";

        messageEl.style.backgroundColor =
            type === "success" ? "#d4edda" : "#f8d7da";
        messageEl.style.color = type === "success" ? "#155724" : "#721c24";
        messageEl.style.border =
            type === "success" ? "1px solid #c3e6cb" : "1px solid #f5c6cb";
        messageEl.style.opacity = "1";

        setTimeout(() => {
            messageEl.style.opacity = "0";
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 2000);
    }

    // Advanced Features Methods
    setupAdvancedEventListeners() {
        // Sessions tab
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
                            this.showPopupMessage("Session saved!", "success");
                            this.loadSessionsData();
                        }
                    } catch (error) {
                        this.showPopupMessage(
                            "Failed to save session",
                            "error"
                        );
                    }
                }
            });
        }

        // Analytics tab
        const focusModeToggle = document.getElementById("focus-mode-toggle");
        if (focusModeToggle) {
            focusModeToggle.addEventListener("click", async () => {
                try {
                    const response = await chrome.runtime.sendMessage({
                        action: "getActivityDashboard",
                    });

                    const isEnabled =
                        response.success && response.data.focusMode.enabled;

                    await chrome.runtime.sendMessage({
                        action: isEnabled
                            ? "disableFocusMode"
                            : "enableFocusMode",
                        options: {},
                    });

                    this.showPopupMessage(
                        isEnabled
                            ? "Focus mode disabled"
                            : "Focus mode enabled",
                        "success"
                    );
                    this.loadAnalyticsData();
                } catch (error) {
                    this.showPopupMessage(
                        "Failed to toggle focus mode",
                        "error"
                    );
                }
            });
        }

        const exportAnalyticsBtn = document.getElementById("export-analytics");
        if (exportAnalyticsBtn) {
            exportAnalyticsBtn.addEventListener("click", async () => {
                try {
                    const response = await chrome.runtime.sendMessage({
                        action: "exportAnalytics",
                    });

                    if (response.success) {
                        // Create download
                        const dataUrl =
                            "data:application/json;charset=utf-8," +
                            encodeURIComponent(response.data);
                        const a = document.createElement("a");
                        a.href = dataUrl;
                        a.download = "tab-suspend-pro-analytics.json";
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);

                        this.showPopupMessage("Analytics exported!", "success");
                    }
                } catch (error) {
                    this.showPopupMessage(
                        "Failed to export analytics",
                        "error"
                    );
                }
            });
        }

        // Organization tab
        const workspaceProfile = document.getElementById("workspace-profile");
        if (workspaceProfile) {
            workspaceProfile.addEventListener("change", async (e) => {
                try {
                    const response = await chrome.runtime.sendMessage({
                        action: "switchProfile",
                        profileId: e.target.value,
                    });

                    if (response.success) {
                        this.showPopupMessage(
                            `Switched to ${response.profile.name}`,
                            "success"
                        );
                    }
                } catch (error) {
                    this.showPopupMessage("Failed to switch profile", "error");
                }
            });
        }

        const groupByDomainBtn = document.getElementById("group-by-domain");
        if (groupByDomainBtn) {
            groupByDomainBtn.addEventListener("click", async () => {
                try {
                    await chrome.runtime.sendMessage({
                        action: "groupByTimeOpened",
                    });
                    this.showPopupMessage("Tabs grouped by domain", "success");
                } catch (error) {
                    this.showPopupMessage("Failed to group tabs", "error");
                }
            });
        }

        const groupByTimeBtn = document.getElementById("group-by-time");
        if (groupByTimeBtn) {
            groupByTimeBtn.addEventListener("click", async () => {
                try {
                    await chrome.runtime.sendMessage({
                        action: "groupByTimeOpened",
                    });
                    this.showPopupMessage("Tabs grouped by time", "success");
                } catch (error) {
                    this.showPopupMessage("Failed to group tabs", "error");
                }
            });
        }

        const createTabStackBtn = document.getElementById("create-tab-stack");
        if (createTabStackBtn) {
            createTabStackBtn.addEventListener("click", async () => {
                const tabs = await chrome.tabs.query({
                    currentWindow: true,
                    highlighted: true,
                });
                if (tabs.length < 2) {
                    this.showPopupMessage(
                        "Select at least 2 tabs to create a stack",
                        "error"
                    );
                    return;
                }

                const name = prompt("Enter stack name:", "Tab Stack");
                if (name) {
                    try {
                        await chrome.runtime.sendMessage({
                            action: "createTabStack",
                            name: name,
                            tabIds: tabs.map((t) => t.id),
                        });
                        this.showPopupMessage("Tab stack created!", "success");
                    } catch (error) {
                        this.showPopupMessage(
                            "Failed to create tab stack",
                            "error"
                        );
                    }
                }
            });
        }
    }

    async loadSessionsData() {
        try {
            // Load session templates
            const templatesResponse = await chrome.runtime.sendMessage({
                action: "getSessionTemplates",
            });

            if (templatesResponse.success) {
                this.updateSessionTemplates(templatesResponse.templates);
            }

            // Load recent sessions
            const sessionsResponse = await chrome.runtime.sendMessage({
                action: "getSessions",
                limit: 3,
            });

            if (sessionsResponse.success) {
                this.updateRecentSessions(sessionsResponse.sessions);
            }
        } catch (error) {
            console.error("Error loading sessions data:", error);
        }
    }

    updateSessionTemplates(templates) {
        const container = document.getElementById("session-templates-list");
        if (!container) return;

        if (!templates || templates.length === 0) {
            container.innerHTML =
                '<div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem;">No templates yet</div>';
            return;
        }

        container.innerHTML = templates
            .slice(0, 3)
            .map(
                (template) => `
            <div class="template-item" data-template-id="${template.id}">
                <div class="template-item-content">
                    <div class="template-item-info">
                        <div class="template-title">${template.name}</div>
                        <div class="template-meta">${template.workflowType} • Used ${template.usageCount} times</div>
                    </div>
                    <button class="template-delete-btn" data-template-id="${template.id}" title="Delete template">🗑️</button>
                </div>
            </div>
        `
            )
            .join("");

        // Add click handlers for restore
        container.querySelectorAll(".template-item-info").forEach((item) => {
            item.addEventListener("click", () => {
                const templateId =
                    item.closest(".template-item").dataset.templateId;
                this.restoreTemplate(templateId);
            });
        });

        // Add click handlers for delete
        container.querySelectorAll(".template-delete-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.deleteTemplate(btn.dataset.templateId);
            });
        });
    }

    updateRecentSessions(sessions) {
        const container = document.getElementById("recent-sessions-list");
        if (!container) return;

        if (!sessions || sessions.length === 0) {
            container.innerHTML =
                '<div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem;">No recent sessions</div>';
            return;
        }

        container.innerHTML = sessions
            .map(
                (session) => `
            <div class="session-item" data-session-id="${session.id}">
                <div class="session-item-content">
                    <div class="session-item-info">
                        <div class="session-title">${session.name}</div>
                        <div class="session-meta">${
                            session.stats.totalTabs
                        } tabs • ${this.formatTimeAgo(session.timestamp)}</div>
                    </div>
                    <button class="session-delete-btn" data-session-id="${
                        session.id
                    }" title="Delete session">🗑️</button>
                </div>
            </div>
        `
            )
            .join("");

        // Add click handlers for restore
        container.querySelectorAll(".session-item-info").forEach((item) => {
            item.addEventListener("click", () => {
                const sessionId =
                    item.closest(".session-item").dataset.sessionId;
                this.restoreSession(sessionId);
            });
        });

        // Add click handlers for delete
        container.querySelectorAll(".session-delete-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.deleteSession(btn.dataset.sessionId);
            });
        });
    }

    async loadAnalyticsData() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "getPerformanceDashboard",
            });

            if (response.success) {
                this.updateAnalyticsData(response.data);
            }

            const activityResponse = await chrome.runtime.sendMessage({
                action: "getActivityDashboard",
            });

            if (activityResponse.success) {
                this.updateActivityData(activityResponse.data);
            }
        } catch (error) {
            console.error("Error loading analytics data:", error);
        }
    }

    updateAnalyticsData(data) {
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
        const memoryUsage = document.getElementById("memory-usage");
        const activeTabs = document.getElementById("active-tabs");
        const suspendedTabs = document.getElementById("suspended-tabs");

        if (memoryUsage && data.currentMetrics) {
            memoryUsage.textContent = `${Math.round(
                data.currentMetrics.memoryUsagePercent || 0
            )}%`;
        }
        if (activeTabs && data.currentMetrics) {
            activeTabs.textContent = data.currentMetrics.tabCount || 0;
        }
        if (suspendedTabs && data.currentMetrics) {
            suspendedTabs.textContent =
                data.currentMetrics.suspendedTabCount || 0;
        }

        // Update top sites
        if (data.topMemoryTabs) {
            this.updateTopSites(data.topMemoryTabs);
        }
    }

    updateActivityData(data) {
        // Update focus mode button
        const focusModeBtn = document.getElementById("focus-mode-toggle");
        if (focusModeBtn && data.focusMode) {
            if (data.focusMode.enabled) {
                focusModeBtn.textContent = "🎯 Disable Focus Mode";
                focusModeBtn.style.background = "var(--success-color)";
                focusModeBtn.style.color = "white";
            } else {
                focusModeBtn.textContent = "🎯 Enable Focus Mode";
                focusModeBtn.style.background = "";
                focusModeBtn.style.color = "";
            }
        }

        // Update most used sites
        if (data.mostUsedSites) {
            this.updateTopSites(data.mostUsedSites);
        }
    }

    updateTopSites(sites) {
        const container = document.getElementById("top-sites-list");
        if (!container) return;

        if (!sites || sites.length === 0) {
            container.innerHTML =
                '<div style="text-align: center; color: var(--text-secondary);">No site data</div>';
            return;
        }

        container.innerHTML = sites
            .slice(0, 5)
            .map(
                (site) => `
            <div class="top-site-item">
                <div class="site-domain">${site.domain}</div>
                <div class="site-time">${
                    site.memoryUsage
                        ? this.formatBytes(site.memoryUsage * 1024 * 1024)
                        : site.timeSpent
                        ? this.formatMinutes(site.timeSpent)
                        : site.visits + " visits"
                }</div>
            </div>
        `
            )
            .join("");
    }

    async loadOrganizationData() {
        try {
            const profilesResponse = await chrome.runtime.sendMessage({
                action: "getProfiles",
            });

            if (profilesResponse.success) {
                this.updateWorkspaceProfiles(profilesResponse.profiles);
            }

            // Get current profile
            const currentProfile = await chrome.runtime.sendMessage({
                action: "getCurrentProfile",
            });

            if (currentProfile.success) {
                this.updateCurrentProfileInfo(currentProfile.profile);
            }
        } catch (error) {
            console.error("Error loading organization data:", error);
        }
    }

    updateWorkspaceProfiles(profiles) {
        const selector = document.getElementById("workspace-profile");
        if (!selector) return;

        selector.innerHTML = profiles
            .map(
                (profile) =>
                    `<option value="${profile.id}">${profile.name}</option>`
            )
            .join("");
    }

    updateCurrentProfileInfo(profile) {
        const container = document.getElementById("current-profile-info");
        if (!container || !profile) return;

        const profileSelector = document.getElementById("workspace-profile");
        if (profileSelector) {
            profileSelector.value = profile.id;
        }

        container.innerHTML = `
            <h5 style="margin: 0 0 8px 0; font-size: 0.8rem; color: var(--text-secondary);">Current Profile</h5>
            <div style="font-size: 0.8rem;">
                <strong>${profile.name}</strong><br>
                ${profile.description}<br>
                <span style="color: var(--text-secondary);">${profile.autoGroupRules.length} auto-group rules</span>
            </div>
        `;
    }

    async restoreSession(sessionId) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "restoreSession",
                sessionId: sessionId,
                options: { newWindows: false },
            });

            if (response.success) {
                this.showPopupMessage("Session restored!", "success");
            }
        } catch (error) {
            this.showPopupMessage("Failed to restore session", "error");
        }
    }

    async restoreTemplate(templateId) {
        try {
            // Templates would be restored similar to sessions
            this.showPopupMessage("Template feature coming soon!", "info");
        } catch (error) {
            this.showPopupMessage("Failed to restore template", "error");
        }
    }

    async deleteTemplate(templateId) {
        try {
            if (!confirm("Are you sure you want to delete this template?")) {
                return;
            }

            const response = await chrome.runtime.sendMessage({
                action: "deleteSessionTemplate",
                templateId: templateId,
            });

            if (response.success) {
                this.showPopupMessage(
                    "Template deleted successfully!",
                    "success"
                );
                // Refresh the templates list
                this.loadSessionsData();
            } else {
                this.showPopupMessage("Failed to delete template", "error");
            }
        } catch (error) {
            console.error("Error deleting template:", error);
            this.showPopupMessage("Failed to delete template", "error");
        }
    }

    async deleteSession(sessionId) {
        try {
            if (!confirm("Are you sure you want to delete this session?")) {
                return;
            }

            const response = await chrome.runtime.sendMessage({
                action: "deleteSession",
                sessionId: sessionId,
            });

            if (response.success) {
                this.showPopupMessage(
                    "Session deleted successfully!",
                    "success"
                );
                // Refresh the sessions list
                this.loadSessionsData();
            } else {
                this.showPopupMessage("Failed to delete session", "error");
            }
        } catch (error) {
            console.error("Error deleting session:", error);
            this.showPopupMessage("Failed to delete session", "error");
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
}

// Global function for suggestion buttons
async function suspendSuggestedTab(tabId) {
    try {
        await chrome.runtime.sendMessage({ action: "suspendTab", tabId });
        const suggestionItem = event.target.closest(".suggestion-item");
        if (suggestionItem) {
            suggestionItem.remove();
        }

        const suggestionList = document.getElementById("suggestion-list");
        if (suggestionList && suggestionList.children.length === 0) {
            const suggestionsDiv = document.getElementById("suggestions");
            if (suggestionsDiv) {
                suggestionsDiv.style.display = "none";
            }
        }

        if (window.popupManager) {
            setTimeout(() => {
                window.popupManager.updateStats().then(() => {
                    window.popupManager.updateUI();
                });
            }, 500);
        }
    } catch (error) {
        console.error("Error suspending suggested tab:", error);
    }
}

// Initialize popup when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        window.popupManager = new PopupManager();
    });
} else {
    window.popupManager = new PopupManager();
}
