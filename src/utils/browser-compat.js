// Browser Compatibility Layer
// Handles API differences between Chrome, Edge, Brave, and other Chromium browsers

class BrowserCompat {
    constructor() {
        this.browser = this.detectBrowser();
        this.capabilities = this.detectCapabilities();
    }

    // Detect which browser is running this extension
    detectBrowser() {
        try {
            // Check for Edge
            if (navigator.userAgent.includes("Edg")) {
                return "edge";
            }
            // Check for Brave
            if (navigator.brave) {
                return "brave";
            }
            // Check for Opera
            if (navigator.userAgent.includes("OPR")) {
                return "opera";
            }
            // Default to Chrome (includes Chromium)
            return "chrome";
        } catch (e) {
            return "chrome";
        }
    }

    // Detect which features are available
    detectCapabilities() {
        const caps = {
            // Core storage (all Chromium browsers support this)
            storage: true,
            tabs: true,
            runtime: true,
            notifications: true,
            contextMenus: true,

            // Chrome-specific features (limited or unavailable in other browsers)
            tabGroups: false, // Edge, Brave don't support tab grouping
            system: false, // System monitoring not widely available
            identity: false, // OAuth only in some browsers
            identity_id: false, // Identity service varies

            // DNR (Declarative Net Request) - widely supported in Chromium browsers
            declarativeNetRequest: false,

            // Alarm feature
            alarms: true,

            // Commands
            commands: true,

            // Web Request (deprecated, use DNR instead)
            webRequest: false,
        };

        // Check actual API availability
        try {
            if (chrome.tabGroups) caps.tabGroups = true;
        } catch (e) {}

        try {
            if (chrome.system) caps.system = true;
        } catch (e) {}

        try {
            if (chrome.identity) {
                caps.identity = true;
                // Some browsers have limited identity support
                if (chrome.identity.getProfileUserInfo) {
                    caps.identity_id = true;
                }
            }
        } catch (e) {}

        try {
            if (chrome.declarativeNetRequest) caps.declarativeNetRequest = true;
        } catch (e) {}

        try {
            if (chrome.webRequest) caps.webRequest = true;
        } catch (e) {}

        return caps;
    }

    // Get browser name for display
    getBrowserName() {
        const names = {
            chrome: "Google Chrome",
            edge: "Microsoft Edge",
            brave: "Brave",
            opera: "Opera",
        };
        return names[this.browser] || "Chromium-based Browser";
    }

    // Safe wrapper for chrome.tabs.group() - not available in all browsers
    async safeTabsGroup(options) {
        try {
            if (this.capabilities.tabGroups && chrome.tabs.group) {
                return await chrome.tabs.group(options);
            }
        } catch (e) {
            console.warn(
                "[BrowserCompat] Tab grouping not supported:",
                e.message
            );
        }
        return null;
    }

    // Safe wrapper for chrome.tabGroups APIs
    async safeTabGroupsUpdate(groupId, properties) {
        try {
            if (
                this.capabilities.tabGroups &&
                chrome.tabGroups &&
                chrome.tabGroups.update
            ) {
                return await chrome.tabGroups.update(groupId, properties);
            }
        } catch (e) {
            console.warn(
                "[BrowserCompat] Tab group update not supported:",
                e.message
            );
        }
        return null;
    }

    // Safe wrapper for chrome.tabGroups.get()
    async safeTabGroupsGet(groupId) {
        try {
            if (
                this.capabilities.tabGroups &&
                chrome.tabGroups &&
                chrome.tabGroups.get
            ) {
                return await chrome.tabGroups.get(groupId);
            }
        } catch (e) {
            console.warn(
                "[BrowserCompat] Tab group get not supported:",
                e.message
            );
        }
        return null;
    }

    // Check if tab is in a group (returns false if not supported)
    isTabInGroup(tab) {
        if (!tab.groupId) return false;

        try {
            if (this.capabilities.tabGroups && chrome.tabGroups) {
                // Check if groupId is not "none"
                return tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE;
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    // Get TAB_GROUP_ID_NONE constant safely
    getTabGroupIdNone() {
        try {
            if (
                this.capabilities.tabGroups &&
                chrome.tabGroups &&
                chrome.tabGroups.TAB_GROUP_ID_NONE !== undefined
            ) {
                return chrome.tabGroups.TAB_GROUP_ID_NONE;
            }
        } catch (e) {}
        // Fallback: -1 is typically used as "no group"
        return -1;
    }

    // Safe wrapper for system.memory
    async getSafeMemoryInfo() {
        try {
            if (
                this.capabilities.system &&
                chrome.system &&
                chrome.system.memory
            ) {
                return await chrome.system.memory.getInfo();
            }
        } catch (e) {
            console.warn("[BrowserCompat] System memory API not available");
        }
        // Return mock data as fallback
        return {
            capacity: 0,
            availableCapacity: 0,
        };
    }

    // Safe wrapper for system.cpu
    async getSafeCpuInfo() {
        try {
            if (
                this.capabilities.system &&
                chrome.system &&
                chrome.system.cpu
            ) {
                return await chrome.system.cpu.getInfo();
            }
        } catch (e) {
            console.warn("[BrowserCompat] System CPU API not available");
        }
        // Return mock data as fallback
        return {
            numOfProcessors: 0,
            archName: "unknown",
            modelName: "unknown",
            processors: [],
        };
    }

    // Safe wrapper for identity API
    async getSafeIdentity() {
        try {
            if (
                this.capabilities.identity &&
                chrome.identity &&
                chrome.identity.getProfileUserInfo
            ) {
                return await chrome.identity.getProfileUserInfo();
            }
        } catch (e) {
            console.warn("[BrowserCompat] Identity API not available");
        }
        return {
            email: "",
            id: "",
        };
    }

    // Check if DeclarativeNetRequest is available
    hasDeclarativeNetRequest() {
        return this.capabilities.declarativeNetRequest;
    }

    // Log browser info for debugging
    logBrowserInfo() {
        console.log(`[BrowserCompat] Browser: ${this.getBrowserName()}`);
        console.log("[BrowserCompat] Capabilities:", this.capabilities);
        return {
            browser: this.browser,
            name: this.getBrowserName(),
            capabilities: this.capabilities,
        };
    }

    // Fallback for unsupported APIs
    notifyUnsupportedFeature(feature) {
        console.warn(
            `[BrowserCompat] Feature '${feature}' is not supported in ${this.getBrowserName()}`
        );
    }
}

// Create singleton instance
const browserCompat = new BrowserCompat();

// Export for use
if (typeof module !== "undefined" && module.exports) {
    module.exports = BrowserCompat;
}
