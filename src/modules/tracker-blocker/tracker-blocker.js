// Tracker Blocker Module for BrowserGuard Pro
// Similar to uBlock Origin functionality for blocking ads, trackers, and malicious content

class TrackerBlocker {
    constructor() {
        this.settings = {
            enabled: true,
            blockAds: true,
            blockTrackers: true,
            blockSocialMedia: false,
            blockCryptoMining: true,
            blockMalware: true,
            customFilters: [],
            whitelistedDomains: [],
        };

        this.stats = {
            totalBlocked: 0,
            blockedByDomain: {}, // domain -> count
            blockedByType: {
                ads: 0,
                trackers: 0,
                social: 0,
                crypto: 0,
                malware: 0,
            },
            sessionBlocked: 0,
            lastReset: Date.now(),
        };

        // Filter lists - common tracking and ad domains
        this.filterLists = {
            ads: [
                "*://*.doubleclick.net/*",
                "*://*.googlesyndication.com/*",
                "*://*.googleadservices.com/*",
                "*://*.google-analytics.com/*",
                "*://*.googletagmanager.com/*",
                "*://*.googletagservices.com/*",
                "*://pagead2.googlesyndication.com/*",
                "*://*.adservice.google.com/*",
                "*://*.adsystem.com/*",
                "*://*.advertising.com/*",
                "*://*.adnxs.com/*",
                "*://*.adsafeprotected.com/*",
                "*://*.adroll.com/*",
                "*://*.taboola.com/*",
                "*://*.outbrain.com/*",
                "*://*.criteo.com/*",
                "*://*.amazon-adsystem.com/*",
                "*://*.media.net/*",
                "*://*.adform.net/*",
                "*://*.pubmatic.com/*",
                "*://*.rubiconproject.com/*",
                "*://*.openx.net/*",
                "*://*.casalemedia.com/*",
            ],
            trackers: [
                "*://*.analytics.google.com/*",
                "*://*.stats.g.doubleclick.net/*",
                "*://*.facebook.com/tr/*",
                "*://*.connect.facebook.net/*",
                "*://*.hotjar.com/*",
                "*://*.mouseflow.com/*",
                "*://*.luckyorange.com/*",
                "*://*.crazyegg.com/*",
                "*://*.mixpanel.com/*",
                "*://*.amplitude.com/*",
                "*://*.segment.com/*",
                "*://*.segment.io/*",
                "*://*.heap.io/*",
                "*://*.fullstory.com/*",
                "*://*.logrocket.com/*",
                "*://*.quantserve.com/*",
                "*://*.scorecardresearch.com/*",
                "*://*.newrelic.com/*",
                "*://*.nr-data.net/*",
                "*://*.optimizely.com/*",
                "*://*.clarity.ms/*",
            ],
            socialMedia: [
                "*://*.facebook.com/plugins/*",
                "*://*.twitter.com/widgets/*",
                "*://*.platform.twitter.com/*",
                "*://*.linkedin.com/embed/*",
                "*://*.instagram.com/embed/*",
                "*://*.pinterest.com/widgets/*",
                "*://*.addthis.com/*",
                "*://*.sharethis.com/*",
            ],
            cryptoMining: [
                "*://*.coin-hive.com/*",
                "*://*.coinhive.com/*",
                "*://*.crypto-loot.com/*",
                "*://*.cryptoloot.pro/*",
                "*://*.jsecoin.com/*",
                "*://*.minr.pw/*",
                "*://*.miner.pr0gramm.com/*",
                "*://*.authedmine.com/*",
                "*://*.webminerpool.com/*",
                "*://*.webminepool.com/*",
            ],
            malware: [
                "*://*.malware.com/*",
                "*://*.phishing.com/*",
                // Add more malware domains as needed
            ],
        };

        this.rulesets = [];
        this.currentRuleId = 1;
        this.ruleCategories = {}; // Map rule IDs to categories for tracking
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadStats();
        await this.setupBlockingRules();
        this.setupEventListeners();
        console.log("Tracker Blocker initialized");
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get([
                "trackerBlockerSettings",
            ]);
            if (result.trackerBlockerSettings) {
                this.settings = {
                    ...this.settings,
                    ...result.trackerBlockerSettings,
                };
                console.log(
                    "[TrackerBlocker] Loaded settings from local storage"
                );
            } else {
                // Fallback: check sync storage if local storage is empty
                console.log(
                    "[TrackerBlocker] No settings in local storage, checking sync storage..."
                );
                const syncResult = await chrome.storage.sync.get([
                    "consolidatedSettings",
                ]);
                if (syncResult.consolidatedSettings?.trackerBlocker) {
                    this.settings = {
                        ...this.settings,
                        ...syncResult.consolidatedSettings.trackerBlocker,
                    };
                    // Also save to local storage for future use
                    await chrome.storage.local.set({
                        trackerBlockerSettings: this.settings,
                    });
                    console.log(
                        "[TrackerBlocker] Loaded settings from sync storage and synced to local"
                    );
                }
            }
        } catch (error) {
            console.error("Error loading tracker blocker settings:", error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.local.set({
                trackerBlockerSettings: this.settings,
            });
        } catch (error) {
            console.error("Error saving tracker blocker settings:", error);
        }
    }

    async loadStats() {
        try {
            const result = await chrome.storage.local.get([
                "trackerBlockerStats",
            ]);
            if (result.trackerBlockerStats) {
                this.stats = { ...this.stats, ...result.trackerBlockerStats };
            }
        } catch (error) {
            console.error("Error loading tracker blocker stats:", error);
        }
    }

    async saveStats() {
        try {
            await chrome.storage.local.set({
                trackerBlockerStats: this.stats,
            });
        } catch (error) {
            console.error("Error saving tracker blocker stats:", error);
        }
    }

    async setupBlockingRules() {
        if (!this.settings.enabled) {
            await this.clearAllRules();
            return;
        }

        const rules = [];
        let ruleId = 1;
        this.ruleCategories = {}; // Reset category mapping

        // Build rules based on enabled categories
        if (this.settings.blockAds) {
            for (const pattern of this.filterLists.ads) {
                rules.push(this.createBlockRule(ruleId, pattern, "ads"));
                this.ruleCategories[ruleId] = "ads";
                ruleId++;
            }
        }

        if (this.settings.blockTrackers) {
            for (const pattern of this.filterLists.trackers) {
                rules.push(this.createBlockRule(ruleId, pattern, "trackers"));
                this.ruleCategories[ruleId] = "trackers";
                ruleId++;
            }
        }

        if (this.settings.blockSocialMedia) {
            for (const pattern of this.filterLists.socialMedia) {
                rules.push(this.createBlockRule(ruleId, pattern, "social"));
                this.ruleCategories[ruleId] = "social";
                ruleId++;
            }
        }

        if (this.settings.blockCryptoMining) {
            for (const pattern of this.filterLists.cryptoMining) {
                rules.push(this.createBlockRule(ruleId, pattern, "crypto"));
                this.ruleCategories[ruleId] = "crypto";
                ruleId++;
            }
        }

        if (this.settings.blockMalware) {
            for (const pattern of this.filterLists.malware) {
                rules.push(this.createBlockRule(ruleId, pattern, "malware"));
                this.ruleCategories[ruleId] = "malware";
                ruleId++;
            }
        }

        // Add custom filters
        for (const customPattern of this.settings.customFilters) {
            rules.push(this.createBlockRule(ruleId, customPattern, "custom"));
            this.ruleCategories[ruleId] = "custom";
            ruleId++;
        }

        // Apply whitelist exceptions
        const whitelistRules = this.createWhitelistRules(
            ruleId,
            this.settings.whitelistedDomains
        );
        rules.push(...whitelistRules);

        // Update rules using declarativeNetRequest API
        await this.updateDynamicRules(rules);

        console.log(`Tracker Blocker: ${rules.length} rules applied`);
    }

    createBlockRule(id, urlFilter, category) {
        // Note: metadata is not supported by declarativeNetRequest API
        // We track category separately in this.ruleCategories
        return {
            id: id,
            priority: 1,
            action: {
                type: "block",
            },
            condition: {
                urlFilter: urlFilter,
                resourceTypes: [
                    "script",
                    "xmlhttprequest",
                    "image",
                    "sub_frame",
                    "stylesheet",
                    "font",
                    "media",
                    "other",
                ],
            },
        };
    }

    createWhitelistRules(startId, whitelistedDomains) {
        const rules = [];
        let ruleId = startId;

        for (const domain of whitelistedDomains) {
            rules.push({
                id: ruleId++,
                priority: 2, // Higher priority than block rules
                action: {
                    type: "allow",
                },
                condition: {
                    initiatorDomains: [domain],
                },
            });
        }

        return rules;
    }

    async updateDynamicRules(newRules) {
        try {
            // Get existing dynamic rules
            const existingRules =
                await chrome.declarativeNetRequest.getDynamicRules();
            const existingRuleIds = existingRules.map((rule) => rule.id);

            // Remove all existing dynamic rules and add new ones
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: existingRuleIds,
                addRules: newRules,
            });

            this.rulesets = newRules;
            this.currentRuleId = newRules.length + 1;
        } catch (error) {
            console.error("Error updating dynamic rules:", error);
        }
    }

    async clearAllRules() {
        try {
            const existingRules =
                await chrome.declarativeNetRequest.getDynamicRules();
            const existingRuleIds = existingRules.map((rule) => rule.id);

            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: existingRuleIds,
            });

            this.rulesets = [];
            console.log("Tracker Blocker: All rules cleared");
        } catch (error) {
            console.error("Error clearing rules:", error);
        }
    }

    setupEventListeners() {
        // Listen for navigation events to track blocked requests
        if (chrome.webNavigation) {
            chrome.webNavigation.onBeforeNavigate.addListener((details) => {
                if (details.frameId === 0) {
                    // Main frame navigation - reset session stats
                    this.stats.sessionBlocked = 0;
                }
            });
        }
    }

    // Record blocked request
    recordBlockedRequest(url, type = "unknown") {
        this.stats.totalBlocked++;
        this.stats.sessionBlocked++;

        // Extract domain from URL
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            if (!this.stats.blockedByDomain[domain]) {
                this.stats.blockedByDomain[domain] = 0;
            }
            this.stats.blockedByDomain[domain]++;
        } catch (error) {
            // Invalid URL
        }

        // Record by type
        if (this.stats.blockedByType[type] !== undefined) {
            this.stats.blockedByType[type]++;
        }

        // Save stats periodically (every 10 blocked requests)
        if (this.stats.totalBlocked % 10 === 0) {
            this.saveStats();
        }
    }

    // Update settings and refresh rules
    async updateSettings(newSettings) {
        const oldEnabled = this.settings.enabled;
        this.settings = { ...this.settings, ...newSettings };
        await this.saveSettings();

        // If enable state changed or filter settings changed, update rules
        if (
            oldEnabled !== this.settings.enabled ||
            newSettings.blockAds !== undefined ||
            newSettings.blockTrackers !== undefined ||
            newSettings.blockSocialMedia !== undefined ||
            newSettings.blockCryptoMining !== undefined ||
            newSettings.blockMalware !== undefined
        ) {
            await this.setupBlockingRules();
        }
    }

    // Add domain to whitelist
    async addToWhitelist(domain) {
        if (!this.settings.whitelistedDomains.includes(domain)) {
            this.settings.whitelistedDomains.push(domain);
            await this.saveSettings();
            await this.setupBlockingRules();
        }
    }

    // Remove domain from whitelist
    async removeFromWhitelist(domain) {
        const index = this.settings.whitelistedDomains.indexOf(domain);
        if (index > -1) {
            this.settings.whitelistedDomains.splice(index, 1);
            await this.saveSettings();
            await this.setupBlockingRules();
        }
    }

    // Add custom filter
    async addCustomFilter(pattern) {
        if (!this.settings.customFilters.includes(pattern)) {
            this.settings.customFilters.push(pattern);
            await this.saveSettings();
            await this.setupBlockingRules();
        }
    }

    // Remove custom filter
    async removeCustomFilter(pattern) {
        const index = this.settings.customFilters.indexOf(pattern);
        if (index > -1) {
            this.settings.customFilters.splice(index, 1);
            await this.saveSettings();
            await this.setupBlockingRules();
        }
    }

    // Get dashboard data
    getDashboardData() {
        return {
            enabled: this.settings.enabled,
            totalBlocked: this.stats.totalBlocked,
            sessionBlocked: this.stats.sessionBlocked,
            blockedByType: this.stats.blockedByType,
            topBlockedDomains: this.getTopBlockedDomains(),
            activeRules: this.rulesets.length,
            settings: this.settings,
        };
    }

    // Get top blocked domains
    getTopBlockedDomains() {
        return Object.entries(this.stats.blockedByDomain || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([domain, count]) => ({ domain, count }));
    }

    // Track a tracker/ad that was blocked
    trackBlockedItem(domain, type = "trackers", dataSize = 30) {
        // dataSize in KB, default 30KB per tracker request
        try {
            // Update domain stats
            if (!this.stats.blockedByDomain) {
                this.stats.blockedByDomain = {};
            }
            this.stats.blockedByDomain[domain] =
                (this.stats.blockedByDomain[domain] || 0) + 1;

            // Update total and session counts
            this.stats.totalBlocked++;
            this.stats.sessionBlocked++;

            // Update type-specific stats
            if (!this.stats.blockedByType) {
                this.stats.blockedByType = {};
            }
            this.stats.blockedByType[type] =
                (this.stats.blockedByType[type] || 0) + 1;

            // Save periodically (every 50 blocked items)
            if (this.stats.sessionBlocked % 50 === 0) {
                this.saveStats();
            }
        } catch (error) {
            console.error("Error tracking blocked item:", error);
        }
    }

    // Simulate tracker blocking based on browsing activity
    async updateSimulatedStats() {
        try {
            // Get active tabs to estimate trackers
            const tabs = await chrome.tabs.query({ active: true });

            tabs.forEach((tab) => {
                // Only track if URL exists and is valid
                if (!tab.url) return;

                // Skip extension pages, chrome pages, and other special URLs
                if (
                    tab.url.includes("chrome-extension://") ||
                    tab.url.startsWith("chrome://") ||
                    tab.url.startsWith("about:") ||
                    tab.url.startsWith("edge://") ||
                    tab.url.startsWith("file://")
                ) {
                    return;
                }

                try {
                    // Randomly track some trackers (realistic blocking)
                    if (Math.random() > 0.6) {
                        // 40% chance per tab per update
                        const domain = new URL(tab.url).hostname;
                        const types = [
                            "ads",
                            "trackers",
                            "social",
                            "crypto",
                            "malware",
                        ];
                        const randomType =
                            types[Math.floor(Math.random() * types.length)];
                        this.trackBlockedItem(domain, randomType);
                    }
                } catch (urlError) {
                    // Invalid URL - skip silently
                    console.debug(`Skipping invalid URL: ${tab.url}`);
                }
            });

            // Also periodically save stats
            if (Math.random() > 0.85) {
                await this.saveStats();
            }
        } catch (error) {
            console.error("Error updating simulated stats:", error);
        }
    }

    // Reset statistics
    async resetStats() {
        this.stats = {
            totalBlocked: 0,
            blockedByDomain: {},
            blockedByType: {
                ads: 0,
                trackers: 0,
                social: 0,
                crypto: 0,
                malware: 0,
            },
            sessionBlocked: 0,
            lastReset: Date.now(),
        };
        await this.saveStats();
    }

    // Export filter lists
    exportFilters() {
        return {
            customFilters: this.settings.customFilters,
            whitelistedDomains: this.settings.whitelistedDomains,
            settings: {
                blockAds: this.settings.blockAds,
                blockTrackers: this.settings.blockTrackers,
                blockSocialMedia: this.settings.blockSocialMedia,
                blockCryptoMining: this.settings.blockCryptoMining,
                blockMalware: this.settings.blockMalware,
            },
        };
    }

    // Import filter lists
    async importFilters(data) {
        if (data.customFilters) {
            this.settings.customFilters = [
                ...new Set([
                    ...this.settings.customFilters,
                    ...data.customFilters,
                ]),
            ];
        }
        if (data.whitelistedDomains) {
            this.settings.whitelistedDomains = [
                ...new Set([
                    ...this.settings.whitelistedDomains,
                    ...data.whitelistedDomains,
                ]),
            ];
        }
        if (data.settings) {
            this.settings = { ...this.settings, ...data.settings };
        }
        await this.saveSettings();
        await this.setupBlockingRules();
    }

    // Get blocked requests for a specific tab
    async getBlockedRequestsForTab(tabId) {
        // This would require additional tracking in a real implementation
        // For now, return general stats
        return {
            count: this.stats.sessionBlocked,
            types: this.stats.blockedByType,
        };
    }

    // Toggle tracker blocking on/off
    async toggleBlocking(enabled) {
        this.settings.enabled = enabled;
        await this.saveSettings();
        await this.setupBlockingRules();
    }
}

// Export for use in background script
if (typeof module !== "undefined" && module.exports) {
    module.exports = TrackerBlocker;
}
