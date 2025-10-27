// Tab Activity Analytics Module for BrowserGuard Pro
class TabActivityAnalytics {
    constructor() {
        this.activityHeatmap = new Map(); // Date -> activity data
        this.siteStats = new Map(); // Domain -> usage stats
        this.productivityMetrics = {
            workSites: new Set([
                "github.com",
                "docs.google.com",
                "stackoverflow.com",
                "notion.so",
            ]),
            socialSites: new Set([
                "facebook.com",
                "twitter.com",
                "instagram.com",
                "reddit.com",
            ]),
            entertainmentSites: new Set([
                "youtube.com",
                "netflix.com",
                "twitch.tv",
                "spotify.com",
            ]),
            shoppingSites: new Set([
                "amazon.com",
                "ebay.com",
                "etsy.com",
                "shopify.com",
            ]),
        };
        this.sessionData = [];
        this.focusMode = {
            enabled: false,
            blockedSites: new Set(),
            startTime: null,
            workSites: new Set(),
        };
        this.dailyGoals = {
            maxSocialTime: 60, // minutes
            minWorkTime: 240, // minutes
            maxTabs: 20,
        };
        this.init();
    }

    async init() {
        await this.loadActivityData();
        this.startActivityTracking();
        console.log("Tab Activity Analytics initialized");
    }

    async loadActivityData() {
        try {
            const data = await chrome.storage.local.get([
                "activityHeatmap",
                "siteStats",
                "productivityMetrics",
                "sessionData",
                "focusMode",
                "dailyGoals",
            ]);

            if (data.activityHeatmap) {
                this.activityHeatmap = new Map();
                for (const [dateKey, dayData] of Object.entries(
                    data.activityHeatmap
                )) {
                    this.activityHeatmap.set(dateKey, {
                        ...dayData,
                        uniqueDomains: new Set(dayData.uniqueDomains || []),
                        topDomains: new Map(
                            Object.entries(dayData.topDomains || {})
                        ),
                    });
                }
            }
            if (data.siteStats) {
                this.siteStats = new Map();
                for (const [domain, stats] of Object.entries(data.siteStats)) {
                    this.siteStats.set(domain, {
                        ...stats,
                        titles: new Set(stats.titles || []),
                    });
                }
            }
            if (data.productivityMetrics) {
                this.productivityMetrics = {
                    ...this.productivityMetrics,
                    ...data.productivityMetrics,
                    workSites: new Set(
                        data.productivityMetrics.workSites || []
                    ),
                    socialSites: new Set(
                        data.productivityMetrics.socialSites || []
                    ),
                    entertainmentSites: new Set(
                        data.productivityMetrics.entertainmentSites || []
                    ),
                    shoppingSites: new Set(
                        data.productivityMetrics.shoppingSites || []
                    ),
                };
            }
            if (data.sessionData) {
                this.sessionData = data.sessionData;
            }
            if (data.focusMode) {
                this.focusMode = {
                    ...this.focusMode,
                    ...data.focusMode,
                    blockedSites: new Set(data.focusMode.blockedSites || []),
                    workSites: new Set(data.focusMode.workSites || []),
                };
            }
            if (data.dailyGoals) {
                this.dailyGoals = { ...this.dailyGoals, ...data.dailyGoals };
            }
        } catch (error) {
            console.error("Error loading activity data:", error);
        }
    }

    async saveActivityData() {
        try {
            // Ensure activityHeatmap is initialized as a Map
            if (
                !this.activityHeatmap ||
                !(this.activityHeatmap instanceof Map)
            ) {
                this.activityHeatmap = new Map();
            }

            // Serialize activityHeatmap with proper Set and Map conversion
            const serializedHeatmap = {};
            for (const [dateKey, dayData] of this.activityHeatmap) {
                serializedHeatmap[dateKey] = {
                    ...dayData,
                    uniqueDomains: Array.from(dayData.uniqueDomains || []),
                    topDomains: Object.fromEntries(
                        dayData.topDomains || new Map()
                    ),
                };
            }

            // Serialize siteStats with proper Set conversion
            const serializedSiteStats = {};
            if (this.siteStats instanceof Map) {
                for (const [domain, stats] of this.siteStats) {
                    serializedSiteStats[domain] = {
                        ...stats,
                        titles: Array.from(stats.titles || []),
                    };
                }
            }

            await chrome.storage.local.set({
                activityHeatmap: serializedHeatmap,
                siteStats: serializedSiteStats,
                productivityMetrics: {
                    ...this.productivityMetrics,
                    workSites: Array.from(this.productivityMetrics.workSites),
                    socialSites: Array.from(
                        this.productivityMetrics.socialSites
                    ),
                    entertainmentSites: Array.from(
                        this.productivityMetrics.entertainmentSites
                    ),
                    shoppingSites: Array.from(
                        this.productivityMetrics.shoppingSites
                    ),
                },
                sessionData: this.sessionData,
                focusMode: {
                    ...this.focusMode,
                    blockedSites: Array.from(this.focusMode.blockedSites),
                    workSites: Array.from(this.focusMode.workSites),
                },
                dailyGoals: this.dailyGoals,
            });
        } catch (error) {
            console.error("Error saving activity data:", error);
        }
    }

    // Activity Tracking
    startActivityTracking() {
        // Track active tab changes
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.recordTabActivation(activeInfo.tabId);
        });

        // Track tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === "complete" && tab.url) {
                this.recordTabVisit(tab);
            }
        });

        // Periodic activity recording
        setInterval(() => {
            this.recordCurrentActivity();
        }, 60000); // Every minute
    }

    async recordTabActivation(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (
                !tab.url ||
                tab.url.startsWith("chrome://") ||
                tab.url.startsWith("chrome-extension://")
            ) {
                return;
            }

            // Ensure activityHeatmap is initialized as a Map
            if (
                !this.activityHeatmap ||
                !(this.activityHeatmap instanceof Map)
            ) {
                this.activityHeatmap = new Map();
            }

            const domain = this.extractDomain(tab.url);
            const now = Date.now();
            const dateKey = this.getDateKey(now);
            const hourKey = new Date(now).getHours();

            // Update heatmap
            if (!this.activityHeatmap.has(dateKey)) {
                this.activityHeatmap.set(dateKey, {
                    date: dateKey,
                    hourlyActivity: new Array(24).fill(0),
                    totalSwitches: 0,
                    uniqueDomains: new Set(),
                    topDomains: new Map(),
                });
            }

            const dayData = this.activityHeatmap.get(dateKey);
            dayData.hourlyActivity[hourKey]++;
            dayData.totalSwitches++;

            // Ensure uniqueDomains is a Set
            if (
                !dayData.uniqueDomains ||
                !(dayData.uniqueDomains instanceof Set)
            ) {
                dayData.uniqueDomains = new Set(dayData.uniqueDomains || []);
            }
            dayData.uniqueDomains.add(domain);

            // Ensure topDomains is a Map
            if (!dayData.topDomains || !(dayData.topDomains instanceof Map)) {
                dayData.topDomains = new Map(
                    Object.entries(dayData.topDomains || {})
                );
            }
            const domainCount = dayData.topDomains.get(domain) || 0;
            dayData.topDomains.set(domain, domainCount + 1);

            // Update site stats
            this.updateSiteStats(domain, tab.url, tab.title);

            await this.saveActivityData();
        } catch (error) {
            console.error("Error recording tab activation:", error);
        }
    }

    async recordTabVisit(tab) {
        if (
            !tab.url ||
            tab.url.startsWith("chrome://") ||
            tab.url.startsWith("chrome-extension://")
        ) {
            return;
        }

        const domain = this.extractDomain(tab.url);
        this.updateSiteStats(domain, tab.url, tab.title, "visit");
    }

    async recordCurrentActivity() {
        try {
            const tabs = await chrome.tabs.query({ active: true });
            const now = Date.now();

            for (const tab of tabs) {
                if (
                    tab.url &&
                    !tab.url.startsWith("chrome://") &&
                    !tab.url.startsWith("chrome-extension://")
                ) {
                    const domain = this.extractDomain(tab.url);
                    this.updateSiteStats(domain, tab.url, tab.title, "time", 1); // 1 minute
                }
            }

            // Check focus mode
            if (this.focusMode.enabled) {
                await this.enforceFocusMode(tabs);
            }

            await this.saveActivityData();
        } catch (error) {
            console.error("Error recording current activity:", error);
        }
    }

    updateSiteStats(domain, url, title, type = "activation", duration = 0) {
        // Ensure siteStats is initialized as a Map
        if (!this.siteStats || !(this.siteStats instanceof Map)) {
            this.siteStats = new Map();
        }

        if (!this.siteStats.has(domain)) {
            this.siteStats.set(domain, {
                domain: domain,
                visits: 0,
                activations: 0,
                timeSpent: 0, // minutes
                lastVisit: Date.now(),
                firstVisit: Date.now(),
                titles: new Set(),
                category: this.categorizeDomain(domain),
            });
        }

        const stats = this.siteStats.get(domain);
        stats.lastVisit = Date.now();

        // Ensure titles is a Set
        if (!stats.titles || !(stats.titles instanceof Set)) {
            stats.titles = new Set(stats.titles || []);
        }
        stats.titles.add(title);

        switch (type) {
            case "visit":
                stats.visits++;
                break;
            case "activation":
                stats.activations++;
                break;
            case "time":
                stats.timeSpent += duration;
                break;
        }
    }

    categorizeDomain(domain) {
        if (this.productivityMetrics.workSites.has(domain)) return "work";
        if (this.productivityMetrics.socialSites.has(domain)) return "social";
        if (this.productivityMetrics.entertainmentSites.has(domain))
            return "entertainment";
        if (this.productivityMetrics.shoppingSites.has(domain))
            return "shopping";

        // Auto-categorize based on domain patterns
        if (domain.includes("github") || domain.includes("stackoverflow"))
            return "work";
        if (
            domain.includes("facebook") ||
            domain.includes("twitter") ||
            domain.includes("instagram")
        )
            return "social";
        if (
            domain.includes("youtube") ||
            domain.includes("netflix") ||
            domain.includes("twitch")
        )
            return "entertainment";
        if (
            domain.includes("amazon") ||
            domain.includes("shop") ||
            domain.includes("store")
        )
            return "shopping";

        return "other";
    }

    // Usage Heatmap: Visual calendar showing daily tab usage patterns
    generateUsageHeatmap(days = 90) {
        const heatmapData = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateKey = this.getDateKey(date.getTime());
            const dayData = this.activityHeatmap.get(dateKey);

            heatmapData.push({
                date: dateKey,
                dayOfWeek: date.getDay(),
                totalActivity: dayData ? dayData.totalSwitches : 0,
                hourlyActivity: dayData
                    ? dayData.hourlyActivity
                    : new Array(24).fill(0),
                uniqueDomains: dayData ? dayData.uniqueDomains.size : 0,
            });
        }

        return heatmapData;
    }

    // Most/Least Used Sites
    getMostUsedSites(limit = 10) {
        return Array.from(this.siteStats.values())
            .sort(
                (a, b) =>
                    b.timeSpent + b.activations - (a.timeSpent + a.activations)
            )
            .slice(0, limit)
            .map((site) => ({
                domain: site.domain,
                timeSpent: site.timeSpent,
                visits: site.visits,
                activations: site.activations,
                category: site.category,
                lastVisit: site.lastVisit,
            }));
    }

    getLeastUsedSites(limit = 10) {
        return Array.from(this.siteStats.values())
            .filter((site) => site.visits > 0) // Only include visited sites
            .sort(
                (a, b) =>
                    a.timeSpent + a.activations - (b.timeSpent + b.activations)
            )
            .slice(0, limit)
            .map((site) => ({
                domain: site.domain,
                timeSpent: site.timeSpent,
                visits: site.visits,
                activations: site.activations,
                category: site.category,
                lastVisit: site.lastVisit,
            }));
    }

    // Productivity Metrics
    getProductivityMetrics(period = "today") {
        const metrics = {
            workTime: 0,
            socialTime: 0,
            entertainmentTime: 0,
            shoppingTime: 0,
            otherTime: 0,
            totalTime: 0,
            productivityScore: 0,
            distractionEvents: 0,
        };

        const sites = Array.from(this.siteStats.values());
        const cutoffTime = this.getPeriodCutoff(period);

        for (const site of sites) {
            if (site.lastVisit < cutoffTime) continue;

            const timeSpent = this.getTimeSpentInPeriod(site, period);
            metrics.totalTime += timeSpent;

            switch (site.category) {
                case "work":
                    metrics.workTime += timeSpent;
                    break;
                case "social":
                    metrics.socialTime += timeSpent;
                    metrics.distractionEvents += site.activations;
                    break;
                case "entertainment":
                    metrics.entertainmentTime += timeSpent;
                    metrics.distractionEvents += site.activations;
                    break;
                case "shopping":
                    metrics.shoppingTime += timeSpent;
                    break;
                default:
                    metrics.otherTime += timeSpent;
            }
        }

        // Calculate productivity score (0-100)
        if (metrics.totalTime > 0) {
            metrics.productivityScore = Math.min(
                100,
                Math.round((metrics.workTime / metrics.totalTime) * 100)
            );
        }

        return metrics;
    }

    // Focus Mode: Block distracting sites, auto-suspend non-work tabs
    async enableFocusMode(options = {}) {
        this.focusMode.enabled = true;
        this.focusMode.startTime = Date.now();

        if (options.blockedSites) {
            this.focusMode.blockedSites = new Set(options.blockedSites);
        }
        if (options.workSites) {
            this.focusMode.workSites = new Set(options.workSites);
        }

        // Apply focus mode to current tabs
        await this.enforceFocusMode();

        // Notification
        chrome.notifications.create({
            type: "basic",
            iconUrl: "ui/assets/icons/icon48.png",
            title: "BrowserGuard Pro",
            message: "Focus Mode enabled! Distracting sites will be blocked.",
        });

        await this.saveActivityData();
    }

    async disableFocusMode() {
        const sessionDuration = this.focusMode.startTime
            ? (Date.now() - this.focusMode.startTime) / 60000
            : 0; // minutes

        this.focusMode.enabled = false;
        this.focusMode.startTime = null;

        // Record focus session
        this.sessionData.push({
            type: "focus",
            startTime: this.focusMode.startTime,
            duration: sessionDuration,
            endTime: Date.now(),
        });

        chrome.notifications.create({
            type: "basic",
            iconUrl: "ui/assets/icons/icon48.png",
            title: "BrowserGuard Pro",
            message: `Focus session completed! Duration: ${Math.round(
                sessionDuration
            )} minutes`,
        });

        await this.saveActivityData();
    }

    async enforceFocusMode(tabs = null) {
        if (!this.focusMode.enabled) return;

        if (!tabs) {
            tabs = await chrome.tabs.query({});
        }

        for (const tab of tabs) {
            if (
                !tab.url ||
                tab.url.startsWith("chrome://") ||
                tab.url.startsWith("chrome-extension://")
            ) {
                continue;
            }

            const domain = this.extractDomain(tab.url);

            // Block distracting sites
            if (
                this.focusMode.blockedSites.has(domain) ||
                this.productivityMetrics.socialSites.has(domain) ||
                this.productivityMetrics.entertainmentSites.has(domain)
            ) {
                // Suspend the tab instead of closing
                if (!tab.url.includes("suspended.html")) {
                    // Send message to main extension to suspend tab
                    chrome.runtime.sendMessage({
                        action: "suspendTab",
                        tabId: tab.id,
                        reason: "focus_mode",
                    });
                }
            }
        }
    }

    // Daily Goal Tracking
    checkDailyGoals() {
        const todayMetrics = this.getProductivityMetrics("today");
        const currentTabs = chrome.tabs.query({}).then((tabs) => tabs.length);

        const goalStatus = {
            socialTime: {
                current: todayMetrics.socialTime,
                goal: this.dailyGoals.maxSocialTime,
                status:
                    todayMetrics.socialTime <= this.dailyGoals.maxSocialTime
                        ? "good"
                        : "exceeded",
            },
            workTime: {
                current: todayMetrics.workTime,
                goal: this.dailyGoals.minWorkTime,
                status:
                    todayMetrics.workTime >= this.dailyGoals.minWorkTime
                        ? "good"
                        : "behind",
            },
            tabCount: {
                current: 0, // Will be updated with currentTabs
                goal: this.dailyGoals.maxTabs,
                status: "unknown",
            },
        };

        return currentTabs.then((count) => {
            goalStatus.tabCount.current = count;
            goalStatus.tabCount.status =
                count <= this.dailyGoals.maxTabs ? "good" : "exceeded";
            return goalStatus;
        });
    }

    // Utility methods
    extractDomain(url) {
        try {
            return new URL(url).hostname.replace("www.", "");
        } catch {
            return "unknown";
        }
    }

    getDateKey(timestamp) {
        return new Date(timestamp).toISOString().split("T")[0];
    }

    getPeriodCutoff(period) {
        const now = Date.now();
        switch (period) {
            case "today":
                return now - 24 * 60 * 60 * 1000;
            case "week":
                return now - 7 * 24 * 60 * 60 * 1000;
            case "month":
                return now - 30 * 24 * 60 * 60 * 1000;
            default:
                return now - 24 * 60 * 60 * 1000;
        }
    }

    getTimeSpentInPeriod(site, period) {
        // Simplified calculation - in a real implementation,
        // this would track actual time periods
        const cutoff = this.getPeriodCutoff(period);
        if (site.lastVisit < cutoff) return 0;

        // Estimate based on activations and visits
        return site.timeSpent * (site.lastVisit > cutoff ? 1 : 0.1);
    }

    // API methods for UI
    getDashboardData() {
        return {
            heatmap: this.generateUsageHeatmap(30),
            mostUsedSites: this.getMostUsedSites(10),
            leastUsedSites: this.getLeastUsedSites(5),
            productivityMetrics: this.getProductivityMetrics("today"),
            weeklyProductivity: this.getProductivityMetrics("week"),
            focusMode: {
                enabled: this.focusMode.enabled,
                startTime: this.focusMode.startTime,
                blockedSites: Array.from(this.focusMode.blockedSites),
            },
        };
    }

    async getDetailedSiteStats(domain) {
        const stats = this.siteStats.get(domain);
        if (!stats) return null;

        return {
            ...stats,
            titles: Array.from(stats.titles),
            productivity: this.getProductivityMetrics("week"),
            weeklyTrend: this.getSiteWeeklyTrend(domain),
        };
    }

    getSiteWeeklyTrend(domain) {
        const trend = [];
        const now = Date.now();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const dateKey = this.getDateKey(date.getTime());
            const dayData = this.activityHeatmap.get(dateKey);

            trend.push({
                date: dateKey,
                activity: dayData ? dayData.topDomains.get(domain) || 0 : 0,
            });
        }

        return trend;
    }

    async updateDailyGoals(goals) {
        this.dailyGoals = { ...this.dailyGoals, ...goals };
        await this.saveActivityData();
    }

    async addSiteToCategory(domain, category) {
        // Ensure all productivityMetrics Sets are properly initialized
        if (
            !this.productivityMetrics.workSites ||
            !(this.productivityMetrics.workSites instanceof Set)
        ) {
            this.productivityMetrics.workSites = new Set(
                this.productivityMetrics.workSites || []
            );
        }
        if (
            !this.productivityMetrics.socialSites ||
            !(this.productivityMetrics.socialSites instanceof Set)
        ) {
            this.productivityMetrics.socialSites = new Set(
                this.productivityMetrics.socialSites || []
            );
        }
        if (
            !this.productivityMetrics.entertainmentSites ||
            !(this.productivityMetrics.entertainmentSites instanceof Set)
        ) {
            this.productivityMetrics.entertainmentSites = new Set(
                this.productivityMetrics.entertainmentSites || []
            );
        }
        if (
            !this.productivityMetrics.shoppingSites ||
            !(this.productivityMetrics.shoppingSites instanceof Set)
        ) {
            this.productivityMetrics.shoppingSites = new Set(
                this.productivityMetrics.shoppingSites || []
            );
        }

        switch (category) {
            case "work":
                this.productivityMetrics.workSites.add(domain);
                break;
            case "social":
                this.productivityMetrics.socialSites.add(domain);
                break;
            case "entertainment":
                this.productivityMetrics.entertainmentSites.add(domain);
                break;
            case "shopping":
                this.productivityMetrics.shoppingSites.add(domain);
                break;
        }

        // Update existing site stats
        if (this.siteStats.has(domain)) {
            this.siteStats.get(domain).category = category;
        }

        await this.saveActivityData();
    }
}

// Export for use in background script
if (typeof module !== "undefined" && module.exports) {
    module.exports = TabActivityAnalytics;
}
