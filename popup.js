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
        await this.updateStats();
        await this.loadTabGroups();
        this.setupEventListeners();
        this.updateUI();
        await this.checkForSuggestions();
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
