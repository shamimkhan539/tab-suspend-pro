// Popup script for Tab Suspend Pro
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

        // Only load saved groups if the feature is enabled AND we can connect to background
        if (this.settings.savedGroupsEnabled) {
            await this.ensureBackgroundReady();
            await this.loadSavedGroups();
        }

        this.setupEventListeners();
        this.updateUI();
        await this.checkForSuggestions();
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
            ]);
            this.settings = result.tabSuspendSettings || { enabled: true };
        } catch (error) {
            console.error("Error loading settings:", error);
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
        // Theme toggle
        const themeToggle = document.getElementById("theme-toggle");
        if (themeToggle) {
            themeToggle.addEventListener("click", () => {
                this.toggleTheme();
            });
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

        if (this.settings.savedGroupsEnabled) {
            // Show tab interface
            tabContainer.style.display = "block";
            content.classList.add("has-tabs");
        } else {
            // Hide tab interface
            tabContainer.style.display = "none";
            content.classList.remove("has-tabs");

            // Show suspend content directly
            const suspendContent = document.getElementById("content-suspend");
            const savedGroupsContent = document.getElementById(
                "content-saved-groups"
            );

            if (suspendContent) suspendContent.classList.add("active");
            if (savedGroupsContent)
                savedGroupsContent.classList.remove("active");
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

        // Load saved groups if switching to that tab
        if (tabName === "saved-groups" && this.settings.savedGroupsEnabled) {
            this.loadSavedGroups();
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
