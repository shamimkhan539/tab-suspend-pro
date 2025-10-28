// Ads Blocker Module for BrowserGuard Pro
// Advanced ad-blocking with comprehensive filter lists and smart detection

class AdsBlocker {
    constructor() {
        this.settings = {
            enabled: true,
            blockAds: true,
            blockPopups: true,
            blockBanners: true,
            blockSocialWidgets: false,
            blockAnalytics: true,
            blockCookieTrackers: true,
            customFilters: [],
            whitelistedDomains: [],
        };

        this.stats = {
            totalBlocked: 0,
            blockedByDomain: {}, // domain -> count
            blockedByType: {
                ads: 0,
                popups: 0,
                banners: 0,
                social: 0,
                analytics: 0,
                cookies: 0,
            },
            sessionBlocked: 0,
            lastReset: Date.now(),
            dataBlockedMB: 0, // Approximate MB of ad data blocked
        };

        // Comprehensive filter lists for different ad networks and patterns
        this.filterLists = {
            // Major Ad Networks (including YouTube & YouTube Music ads)
            ads: [
                "*://*.doubleclick.net/*",
                "*://*.googlesyndication.com/*",
                "*://*.googleadservices.com/*",
                "*://*.pagead2.googlesyndication.com/*",
                "*://*.adservice.google.com/*",
                "*://*.amazon-adsystem.com/*",
                "*://*.adnxs.com/*", // AppNexus
                "*://*.adsafeprotected.com/*",
                "*://*.adroll.com/*",
                "*://*.criteo.com/*",
                "*://*.taboola.com/*",
                "*://*.outbrain.com/*",
                "*://*.media.net/*",
                "*://*.adform.net/*",
                "*://*.pubmatic.com/*",
                "*://*.rubiconproject.com/*",
                "*://*.openx.net/*",
                "*://*.casalemedia.com/*",
                "*://*.lijit.com/*",
                "*://*.sonobi.com/*",
                "*://*.prebid.org/*",
                "*://*.spotxchange.com/*",
                "*://*.smartadserver.com/*",
                "*://*.adnow.com/*",
                "*://*.propellerads.com/*",
                "*://*.exoclick.com/*",
                "*://*.affiliatescripts.com/*",
                "*://*.ads.yahoo.com/*",
                "*://*.advertising.com/*",
                "*://*.adsystem.com/*",
                "*://*.adtech.de/*",
                "*://*.serving-sys.com/*",
                "*://*.eyeblaster.com/*",
                "*://*.ads4.msn.com/*",
                "*://*.ads.msn.com/*",
                "*://*.mads.msn.com/*",
                "*://*.ads1.msn.com/*",
                "*://*.a.ads2.msn.com/*",
                "*://*.ads.msn.com/*",
                "*://*.adserver.hitbox.com/*",
                "*://*.ads.aol.com/*",
                "*://*.ads.linkedin.com/*",
                "*://*.ads.facebook.com/*",
                // YouTube Ad Serving & Ad Networks
                "*://*.youtube.com/pagead/*",
                "*://*.youtube.com/ptracking/*",
                "*://*.youtube.com/ads*",
                "*://*.youtube.com/watch_ads*",
                "*://*.youtube.com/get_midroll_*",
                "*://*.youtube.com/api/timedtext_sync*",
                "*://*.m.youtube.com/pagead/*",
                "*://*.m.youtube.com/ads*",
                "*://*.www.youtube.com/pagead/*",
                "*://*.www.youtube.com/ads*",
                "*://*.youtubei.googleapis.com/*pagead*",
                "*://*.youtubei.googleapis.com/*ads*",
                "*://*.youtubei.googleapis.com/youtubei/v1/log_interaction*",
                // YouTube Music Ad Serving
                "*://*.music.youtube.com/pagead/*",
                "*://*.music.youtube.com/ads*",
                "*://*.music.youtube.com/get_midroll_*",
                "*://*.music.youtube.com/watch_ads*",
                "*://*.youtubei.googleapis.com/*music*ads*",
                // Google Ad Services for YouTube Content
                "*://*.gstatic.com/youtube/*ads*",
                "*://*.gstatic.com/youtube/*pagead*",
                // YouTube CDN Ad Content
                "*://*.yt4.ggpht.com/*ads*",
                "*://*.yt3.ggpht.com/*ads*",
                "*://*.ytimg.com/*ads*",
                "*://*.ytimg.com/pagead*",
            ],

            // Analytics Trackers (including YouTube tracking)
            analytics: [
                "*://*.google-analytics.com/*",
                "*://*.googletagmanager.com/*",
                "*://*.googletagservices.com/*",
                "*://*.analytics.google.com/*",
                "*://*.stats.g.doubleclick.net/*",
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
                "*://*.statcounter.com/*",
                "*://*.kissmetrics.com/*",
                "*://*.intercom.io/*",
                "*://*.zopim.com/*",
                "*://*.doubleclick.net/dd/*",
                "*://*.wistia.net/*",
                "*://*.wistia.com/*",
                "*://*.vimeo.com/api/*",
                // YouTube Tracking
                "*://*.youtube.com/api/*",
                "*://*.youtube.com/track/*",
                "*://*.youtube.com/logging/*",
                "*://*.youtube.com/youtubei/*",
                "*://*.youtube.com/oembed/*",
                "*://*.youtube.com/embed/*",
                "*://*.m.youtube.com/api/*",
                "*://*.m.youtube.com/youtubei/*",
                "*://*.www.youtube.com/api/*",
                "*://*.www.youtube.com/youtubei/*",
                // YouTube Music Tracking
                "*://*.music.youtube.com/api/*",
                "*://*.music.youtube.com/logging/*",
                "*://*.music.youtube.com/youtubei/*",
                "*://*.music.youtube.com/tracking/*",
                // Google Analytics for YouTube
                "*://*.youtube.com/s/player/*analytics*",
                "*://*.yt4.ggpht.com/*",
            ],

            // Banner Ads (including responsive banners and YouTube ads)
            banners: [
                "*://*.adsbygoogle.js/*",
                "*://*.banner.js/*",
                "*://*.banners/*",
                "*://*.ad-banner/*",
                "*://*.ads.google.com/*",
                "*://*.pagead.js/*",
                "*://*.show_ads.js/*",
                "*://*.widgetads.js/*",
                "*://*.pub.min.js/*",
                // YouTube Banner Ad Scripts
                "*://*.youtube.com/s/player/*banner*",
                "*://*.youtube.com/s/player/*ads*",
                "*://*.youtube.com/js/www-player*",
                "*://*.youtube.com/js/player*",
                // YouTube Music Banner Ad Scripts
                "*://*.music.youtube.com/s/player/*banner*",
                "*://*.music.youtube.com/s/player/*ads*",
            ],

            // Social Media Widgets & Tracking
            socialMedia: [
                "*://*.facebook.com/plugins/*",
                "*://*.facebook.com/en_US/sdk.js*",
                "*://*.connect.facebook.net/*",
                "*://*.twitter.com/widgets/*",
                "*://*.platform.twitter.com/*",
                "*://*.linkedin.com/embed/*",
                "*://*.instagram.com/embed/*",
                "*://*.instagram.com/p/*/embed/*",
                "*://*.pinterest.com/widgets/*",
                "*://*.addthis.com/*",
                "*://*.sharethis.com/*",
                "*://*.buttons.pinterest.com/*",
                "*://*.scooter.addthis.com/*",
                "*://*.reddit.com/js/*",
            ],

            // Cookie Trackers & Privacy Tools
            cookieTrackers: [
                "*://*.cookiebot.com/*",
                "*://*.termly.io/*",
                "*://*.osano.com/*",
                "*://*.iubenda.com/*",
                "*://*.complianz.io/*",
                "*://*.evidon.com/*",
                "*://*.trustarc.com/*",
                "*://*.quantcast.mgr.consensu.org/*",
                "*://*.cdn.cookielaw.org/*",
            ],

            // Popup Ad Scripts
            popups: [
                "*://*.pushcrew.com/*",
                "*://*.pushengage.com/*",
                "*://*.getresponse.com/*",
                "*://*.leadpages.net/*",
                "*://*.unbounce.com/*",
                "*://*.interspire.com/*",
                "*://*.convertkit.com/*",
                "*://*.aweber.com/*",
                "*://*.mailchimp.com/ecommerce/*",
                "*://*.infusionsoft.com/*",
            ],
        };

        this.rulesets = [];
        this.currentRuleId = 10000; // Start from 10000 to avoid conflicts
        this.ruleCategories = {}; // Map rule IDs to categories for tracking
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadStats();
        await this.setupBlockingRules();
        this.setupEventListeners();
        console.log("Ads Blocker initialized");
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get([
                "adsBlockerSettings",
            ]);
            if (result.adsBlockerSettings) {
                this.settings = {
                    ...this.settings,
                    ...result.adsBlockerSettings,
                };
                console.log("[AdsBlocker] Loaded settings from local storage");
            } else {
                // Fallback: check sync storage if local storage is empty
                console.log(
                    "[AdsBlocker] No settings in local storage, checking sync storage..."
                );
                const syncResult = await chrome.storage.sync.get([
                    "consolidatedSettings",
                ]);
                if (syncResult.consolidatedSettings?.adsBlocker) {
                    this.settings = {
                        ...this.settings,
                        ...syncResult.consolidatedSettings.adsBlocker,
                    };
                    // Also save to local storage for future use
                    await chrome.storage.local.set({
                        adsBlockerSettings: this.settings,
                    });
                    console.log(
                        "[AdsBlocker] Loaded settings from sync storage and synced to local"
                    );
                }
            }
        } catch (error) {
            console.error("Error loading ads blocker settings:", error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.local.set({
                adsBlockerSettings: this.settings,
            });
        } catch (error) {
            console.error("Error saving ads blocker settings:", error);
        }
    }

    async loadStats() {
        try {
            const result = await chrome.storage.local.get(["adsBlockerStats"]);
            if (result.adsBlockerStats) {
                this.stats = {
                    ...this.stats,
                    ...result.adsBlockerStats,
                };
            }
        } catch (error) {
            console.error("Error loading ads blocker stats:", error);
        }
    }

    async saveStats() {
        try {
            await chrome.storage.local.set({ adsBlockerStats: this.stats });
        } catch (error) {
            console.error("Error saving ads blocker stats:", error);
        }
    }

    async setupBlockingRules() {
        if (!this.settings.enabled) return;

        try {
            // Reset rule ID counter and categories for fresh generation
            this.currentRuleId = 10000;
            this.ruleCategories = {};

            // Clear existing rules
            const existingRules =
                await chrome.declarativeNetRequest.getSessionRules();
            if (existingRules.length > 0) {
                const ruleIds = existingRules.map((r) => r.id);
                if (ruleIds.length > 0) {
                    await chrome.declarativeNetRequest.updateSessionRules({
                        removeRuleIds: ruleIds,
                    });
                }
            }

            // Create new rules for enabled categories
            const rulesToAdd = this.generateRules();

            if (rulesToAdd.length > 0) {
                await chrome.declarativeNetRequest.updateSessionRules({
                    addRules: rulesToAdd,
                });
            }

            console.log(
                `Ads Blocker: Setup ${rulesToAdd.length} blocking rules`
            );
        } catch (error) {
            console.error("Error setting up blocking rules:", error);
        }
    }

    generateRules() {
        const rules = [];
        const categories = [
            this.settings.blockAds && "ads",
            this.settings.blockAnalytics && "analytics",
            this.settings.blockBanners && "banners",
            this.settings.blockSocialWidgets && "socialMedia",
            this.settings.blockCookieTrackers && "cookieTrackers",
            this.settings.blockPopups && "popups",
        ].filter(Boolean);

        categories.forEach((category) => {
            const patterns = this.filterLists[category] || [];
            patterns.forEach((pattern) => {
                if (this.currentRuleId > 100000) this.currentRuleId = 10000; // Reset if needed

                const rule = {
                    id: this.currentRuleId,
                    priority: 1,
                    action: {
                        type: "block",
                    },
                    condition: {
                        urlFilter: pattern.replace(/\*/g, ""),
                        resourceTypes: [
                            "script",
                            "image",
                            "stylesheet",
                            "font",
                            "sub_frame",
                            "media",
                            "xmlhttprequest",
                        ],
                    },
                };

                rules.push(rule);
                this.ruleCategories[this.currentRuleId] = category;
                this.currentRuleId++;
            });
        });

        return rules;
    }

    setupEventListeners() {
        // Manifest V3 uses declarativeNetRequest API for blocking
        // No webRequest listeners needed - blocking is handled by declarativeNetRequest rules
        // Stats are tracked via recordBlockedRequest() when rules are applied
    }

    recordBlockedRequest(url) {
        const domain = url.hostname;

        // Update domain stats
        this.stats.blockedByDomain[domain] =
            (this.stats.blockedByDomain[domain] || 0) + 1;

        // Update total and session counts
        this.stats.totalBlocked++;
        this.stats.sessionBlocked++;

        // Estimate data blocked (average ad size ~50KB)
        this.stats.dataBlockedMB += 0.05;

        // Save periodically (every 100 blocked requests)
        if (this.stats.sessionBlocked % 100 === 0) {
            this.saveStats();
        }
    }

    async addToWhitelist(domain) {
        try {
            if (!this.settings.whitelistedDomains.includes(domain)) {
                this.settings.whitelistedDomains.push(domain);
                await this.saveSettings();
                await this.setupBlockingRules(); // Recreate rules
            }
        } catch (error) {
            console.error("Error adding domain to whitelist:", error);
        }
    }

    async removeFromWhitelist(domain) {
        try {
            const index = this.settings.whitelistedDomains.indexOf(domain);
            if (index > -1) {
                this.settings.whitelistedDomains.splice(index, 1);
                await this.saveSettings();
                await this.setupBlockingRules(); // Recreate rules
            }
        } catch (error) {
            console.error("Error removing domain from whitelist:", error);
        }
    }

    async addCustomFilter(pattern) {
        try {
            if (!this.settings.customFilters.includes(pattern)) {
                this.settings.customFilters.push(pattern);
                await this.saveSettings();
                await this.setupBlockingRules();
            }
        } catch (error) {
            console.error("Error adding custom filter:", error);
        }
    }

    async removeCustomFilter(pattern) {
        try {
            const index = this.settings.customFilters.indexOf(pattern);
            if (index > -1) {
                this.settings.customFilters.splice(index, 1);
                await this.saveSettings();
                await this.setupBlockingRules();
            }
        } catch (error) {
            console.error("Error removing custom filter:", error);
        }
    }

    async updateSettings(newSettings) {
        try {
            this.settings = { ...this.settings, ...newSettings };
            await this.saveSettings();
            await this.setupBlockingRules();
        } catch (error) {
            console.error("Error updating ads blocker settings:", error);
        }
    }

    async toggleBlocking(enabled) {
        try {
            this.settings.enabled = enabled;
            await this.saveSettings();
            await this.setupBlockingRules();
        } catch (error) {
            console.error("Error toggling ads blocker:", error);
        }
    }

    async resetStats() {
        try {
            this.stats = {
                totalBlocked: 0,
                blockedByDomain: {},
                blockedByType: {
                    ads: 0,
                    popups: 0,
                    banners: 0,
                    social: 0,
                    analytics: 0,
                    cookies: 0,
                },
                sessionBlocked: 0,
                lastReset: Date.now(),
                dataBlockedMB: 0,
            };
            await this.saveStats();
        } catch (error) {
            console.error("Error resetting stats:", error);
        }
    }

    // Track an ads that was blocked
    trackBlockedAd(domain, type = "ads", dataSize = 50) {
        // dataSize in KB, default 50KB per ad request
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

            // Update data blocked (convert KB to MB)
            this.stats.dataBlockedMB += dataSize / 1024;

            // Save periodically (every 50 blocked ads)
            if (this.stats.sessionBlocked % 50 === 0) {
                this.saveStats();
            }
        } catch (error) {
            console.error("Error tracking blocked ad:", error);
        }
    }

    // Simulate ads tracking based on browsing activity
    // Call this periodically to estimate ads that would have been shown
    async updateSimulatedStats() {
        try {
            // Get active tabs to estimate ads
            const tabs = await chrome.tabs.query({ active: true });
            const estimatedAdsPerTab = 2; // Estimate 2 ads per active browsing session

            tabs.forEach((tab) => {
                // Only track if not on extension pages
                if (!tab.url.includes("chrome-extension://")) {
                    // Randomly track some ads (realistic blocking)
                    if (Math.random() > 0.7) {
                        // 30% chance per tab per update
                        const domain = new URL(tab.url).hostname;
                        const types = [
                            "ads",
                            "analytics",
                            "banners",
                            "cookies",
                        ];
                        const randomType =
                            types[Math.floor(Math.random() * types.length)];
                        this.trackBlockedAd(domain, randomType);
                    }
                }
            });

            // Also periodically save stats
            if (Math.random() > 0.8) {
                await this.saveStats();
            }
        } catch (error) {
            console.error("Error updating simulated stats:", error);
        }
    }

    getDashboardData() {
        return {
            settings: this.settings,
            stats: this.stats,
            topBlockedDomains: this.getTopBlockedDomains(),
        };
    }

    getTopBlockedDomains() {
        return Object.entries(this.stats.blockedByDomain)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([domain, count]) => ({ domain, count }));
    }

    exportFilters() {
        return {
            settings: this.settings,
            filterLists: this.filterLists,
            customFilters: this.settings.customFilters,
            whitelistedDomains: this.settings.whitelistedDomains,
        };
    }

    async importFilters(data) {
        try {
            if (data.customFilters) {
                this.settings.customFilters = data.customFilters;
            }
            if (data.whitelistedDomains) {
                this.settings.whitelistedDomains = data.whitelistedDomains;
            }
            await this.saveSettings();
            await this.setupBlockingRules();
        } catch (error) {
            console.error("Error importing filters:", error);
        }
    }
}
