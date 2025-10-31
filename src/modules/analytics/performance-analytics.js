// Performance Analytics Module for BrowserGuard Pro
class PerformanceAnalytics {
    constructor() {
        this.memoryHistory = [];
        this.cpuHistory = [];
        this.tabMetrics = new Map();
        this.suspensionStats = {
            totalSuspensions: 0,
            memorySaved: 0,
            averageSuspensionTime: 0,
            suspensionsByDomain: new Map(),
            suspensionsByHour: new Array(24).fill(0),
        };
        this.performanceThresholds = {
            highMemoryUsage: 8 * 1024 * 1024 * 1024, // 8GB
            highCpuUsage: 80, // 80%
            maxTabsBeforeWarning: 50,
        };
        this.monitoringInterval = null;
        this.init();
    }

    async init() {
        await this.loadAnalyticsData();
        this.startMonitoring();
        console.log("Performance Analytics initialized");
    }

    async loadAnalyticsData() {
        try {
            const data = await chrome.storage.local.get([
                "memoryHistory",
                "cpuHistory",
                "tabMetrics",
                "suspensionStats",
                "performanceThresholds",
            ]);

            if (data.memoryHistory) {
                this.memoryHistory = data.memoryHistory;
            }
            if (data.cpuHistory) {
                this.cpuHistory = data.cpuHistory;
            }
            if (data.tabMetrics) {
                this.tabMetrics = new Map(Object.entries(data.tabMetrics));
            }
            if (data.suspensionStats) {
                this.suspensionStats = {
                    ...this.suspensionStats,
                    ...data.suspensionStats,
                    suspensionsByDomain: new Map(
                        Object.entries(
                            data.suspensionStats.suspensionsByDomain || {}
                        )
                    ),
                };
            }
            if (data.performanceThresholds) {
                this.performanceThresholds = {
                    ...this.performanceThresholds,
                    ...data.performanceThresholds,
                };
            }
        } catch (error) {
            console.error("Error loading analytics data:", error);
        }
    }

    async saveAnalyticsData() {
        try {
            await chrome.storage.local.set({
                memoryHistory: this.memoryHistory,
                cpuHistory: this.cpuHistory,
                tabMetrics: Object.fromEntries(this.tabMetrics),
                suspensionStats: {
                    ...this.suspensionStats,
                    suspensionsByDomain: Object.fromEntries(
                        this.suspensionStats.suspensionsByDomain
                    ),
                },
                performanceThresholds: this.performanceThresholds,
            });
        } catch (error) {
            console.error("Error saving analytics data:", error);
        }
    }

    // Memory & Performance Analytics
    startMonitoring() {
        // Monitor every 30 seconds
        this.monitoringInterval = setInterval(async () => {
            await this.collectMetrics();
        }, 30000);

        // Initial collection
        this.collectMetrics();
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    async collectMetrics() {
        try {
            const timestamp = Date.now();

            // Collect memory information
            const memoryInfo = await this.getMemoryInfo();
            this.memoryHistory.push({
                timestamp,
                ...memoryInfo,
            });

            // Collect CPU information
            const cpuInfo = await this.getCPUInfo();
            this.cpuHistory.push({
                timestamp,
                ...cpuInfo,
            });

            // Collect tab-specific metrics
            await this.collectTabMetrics(timestamp);

            // Keep only last 24 hours of data (2880 data points at 30s intervals)
            const dayAgo = timestamp - 24 * 60 * 60 * 1000;
            this.memoryHistory = this.memoryHistory.filter(
                (m) => m.timestamp > dayAgo
            );
            this.cpuHistory = this.cpuHistory.filter(
                (c) => c.timestamp > dayAgo
            );

            // Check for performance issues
            await this.checkPerformanceThresholds(memoryInfo, cpuInfo);

            await this.saveAnalyticsData();
        } catch (error) {
            console.error("Error collecting metrics:", error);
        }
    }

    async getMemoryInfo() {
        try {
            // Check if chrome.system.memory is available
            if (!chrome.system || !chrome.system.memory) {
                console.debug("chrome.system.memory API not available");
                return this.getDefaultMemoryInfo();
            }

            const memoryInfo = await chrome.system.memory.getInfo();
            const tabs = await chrome.tabs.query({});

            return {
                totalMemory: memoryInfo.capacity,
                availableMemory: memoryInfo.availableCapacity,
                usedMemory: memoryInfo.capacity - memoryInfo.availableCapacity,
                usagePercentage:
                    ((memoryInfo.capacity - memoryInfo.availableCapacity) /
                        memoryInfo.capacity) *
                    100,
                tabCount: tabs.length,
                suspendedTabCount: tabs.filter(
                    (tab) => tab.url && tab.url.includes("suspended.html")
                ).length,
            };
        } catch (error) {
            // Service worker not available or API error - return defaults
            console.debug("Error getting memory info:", error.message);
            return this.getDefaultMemoryInfo();
        }
    }

    getDefaultMemoryInfo() {
        return {
            totalMemory: 0,
            availableMemory: 0,
            usedMemory: 0,
            usagePercentage: 0,
            tabCount: 0,
            suspendedTabCount: 0,
        };
    }

    async getCPUInfo() {
        try {
            // Check if chrome.system.cpu is available
            if (!chrome.system || !chrome.system.cpu) {
                console.debug("chrome.system.cpu API not available");
                return this.getDefaultCPUInfo();
            }

            const cpuInfo = await chrome.system.cpu.getInfo();

            // Calculate average CPU usage
            let totalUsage = 0;
            let totalProcessors = 0;

            for (const processor of cpuInfo.processors) {
                const usage = processor.usage;
                if (usage && usage.total > 0) {
                    const idleTime = usage.idle || 0;
                    const activeTime = usage.total - idleTime;
                    const usagePercent = (activeTime / usage.total) * 100;
                    totalUsage += usagePercent;
                    totalProcessors++;
                }
            }

            const averageUsage =
                totalProcessors > 0 ? totalUsage / totalProcessors : 0;

            return {
                processorCount: cpuInfo.numOfProcessors,
                averageUsage: averageUsage,
                maxUsage: Math.max(
                    ...cpuInfo.processors.map((p) => {
                        if (p.usage && p.usage.total > 0) {
                            const idleTime = p.usage.idle || 0;
                            const activeTime = p.usage.total - idleTime;
                            return (activeTime / p.usage.total) * 100;
                        }
                        return 0;
                    })
                ),
            };
        } catch (error) {
            // Service worker not available or API error - return defaults
            console.debug("Error getting CPU info:", error.message);
            return this.getDefaultCPUInfo();
        }
    }

    getDefaultCPUInfo() {
        return {
            processorCount: 0,
            averageUsage: 0,
            maxUsage: 0,
        };
    }

    async collectTabMetrics(timestamp) {
        try {
            const tabs = await chrome.tabs.query({});

            for (const tab of tabs) {
                if (
                    !tab.url ||
                    tab.url.startsWith("chrome://") ||
                    tab.url.startsWith("chrome-extension://")
                ) {
                    continue;
                }

                const domain = this.extractDomain(tab.url);
                const tabKey = `${tab.id}_${domain}`;

                if (!this.tabMetrics.has(tabKey)) {
                    this.tabMetrics.set(tabKey, {
                        id: tab.id,
                        domain: domain,
                        url: tab.url,
                        title: tab.title,
                        createdAt: timestamp,
                        lastAccessed: tab.lastAccessed || timestamp,
                        accessCount: 0,
                        totalActiveTime: 0,
                        estimatedMemoryUsage: this.estimateTabMemoryUsage(tab),
                        suspensionHistory: [],
                    });
                }

                const metrics = this.tabMetrics.get(tabKey);

                // Update metrics
                if (tab.active) {
                    metrics.lastAccessed = timestamp;
                    metrics.accessCount++;
                }

                // Estimate memory usage
                metrics.estimatedMemoryUsage = this.estimateTabMemoryUsage(tab);
            }

            // Clean up metrics for closed tabs
            const currentTabIds = new Set(tabs.map((t) => t.id));
            // Ensure tabMetrics is initialized as a Map
            if (!this.tabMetrics || !(this.tabMetrics instanceof Map)) {
                this.tabMetrics = new Map();
            }
            for (const [key, metrics] of this.tabMetrics) {
                if (!currentTabIds.has(metrics.id)) {
                    this.tabMetrics.delete(key);
                }
            }
        } catch (error) {
            console.error("Error collecting tab metrics:", error);
        }
    }

    estimateTabMemoryUsage(tab) {
        // Basic memory estimation based on tab characteristics
        let baseMemory = 50; // MB base memory per tab

        // Adjust based on domain patterns
        const domain = this.extractDomain(tab.url);
        const memoryIntensiveDomains = {
            "youtube.com": 200,
            "netflix.com": 300,
            "twitch.tv": 250,
            "google.com": 100,
            "facebook.com": 150,
            "twitter.com": 120,
            "instagram.com": 130,
        };

        if (memoryIntensiveDomains[domain]) {
            baseMemory = memoryIntensiveDomains[domain];
        }

        // Adjust for media content
        if (tab.audible) {
            baseMemory *= 1.5; // Audio/video tabs use more memory
        }

        // Adjust for tab age (older tabs might have accumulated more memory)
        const tabAge = Date.now() - (tab.lastAccessed || Date.now());
        const ageMultiplier = Math.min(1 + tabAge / (24 * 60 * 60 * 1000), 2); // Max 2x for very old tabs

        return Math.round(baseMemory * ageMultiplier);
    }

    // Suspension Analytics
    recordSuspension(tabId, url, memorySaved) {
        try {
            // Ensure suspensionStats.suspensionsByDomain is initialized as a Map
            if (
                !this.suspensionStats.suspensionsByDomain ||
                !(this.suspensionStats.suspensionsByDomain instanceof Map)
            ) {
                this.suspensionStats.suspensionsByDomain = new Map();
            }

            const domain = this.extractDomain(url);
            const hour = new Date().getHours();

            this.suspensionStats.totalSuspensions++;
            this.suspensionStats.memorySaved += memorySaved;
            this.suspensionStats.suspensionsByHour[hour]++;

            const domainCount =
                this.suspensionStats.suspensionsByDomain.get(domain) || 0;
            this.suspensionStats.suspensionsByDomain.set(
                domain,
                domainCount + 1
            );

            // Update tab metrics
            const tabKey = Array.from(this.tabMetrics.keys()).find(
                (key) => this.tabMetrics.get(key).id === tabId
            );

            if (tabKey) {
                const metrics = this.tabMetrics.get(tabKey);
                metrics.suspensionHistory.push({
                    timestamp: Date.now(),
                    memorySaved: memorySaved,
                });
            }

            this.saveAnalyticsData();
        } catch (error) {
            console.error("Error recording suspension:", error);
        }
    }

    // Browser Health Score
    calculateHealthScore() {
        try {
            let score = 100;
            const currentMetrics = this.getCurrentMetrics();

            // Memory usage factor (0-30 points)
            if (currentMetrics.memoryUsagePercent > 90) {
                score -= 30;
            } else if (currentMetrics.memoryUsagePercent > 80) {
                score -= 20;
            } else if (currentMetrics.memoryUsagePercent > 70) {
                score -= 10;
            }

            // CPU usage factor (0-25 points)
            if (currentMetrics.cpuUsage > 90) {
                score -= 25;
            } else if (currentMetrics.cpuUsage > 80) {
                score -= 15;
            } else if (currentMetrics.cpuUsage > 70) {
                score -= 8;
            }

            // Tab count factor (0-20 points)
            if (currentMetrics.tabCount > 100) {
                score -= 20;
            } else if (currentMetrics.tabCount > 50) {
                score -= 10;
            } else if (currentMetrics.tabCount > 30) {
                score -= 5;
            }

            // Suspension efficiency factor (0-15 points bonus)
            const suspensionRatio =
                currentMetrics.suspendedTabCount / currentMetrics.tabCount;
            if (suspensionRatio > 0.5) {
                score += 15;
            } else if (suspensionRatio > 0.3) {
                score += 10;
            } else if (suspensionRatio > 0.1) {
                score += 5;
            }

            // Performance trend factor (0-10 points)
            const trend = this.getPerformanceTrend();
            if (trend === "improving") {
                score += 10;
            } else if (trend === "declining") {
                score -= 10;
            }

            return Math.max(0, Math.min(100, Math.round(score)));
        } catch (error) {
            console.error("Error calculating health score:", error);
            return 50; // Default score
        }
    }

    getCurrentMetrics() {
        const latestMemory = this.memoryHistory[this.memoryHistory.length - 1];
        const latestCpu = this.cpuHistory[this.cpuHistory.length - 1];

        return {
            memoryUsagePercent: latestMemory?.usagePercentage || 0,
            cpuUsage: latestCpu?.averageUsage || 0,
            tabCount: latestMemory?.tabCount || 0,
            suspendedTabCount: latestMemory?.suspendedTabCount || 0,
        };
    }

    getPerformanceTrend() {
        if (this.memoryHistory.length < 10) return "stable";

        const recent = this.memoryHistory.slice(-5);
        const older = this.memoryHistory.slice(-10, -5);

        const recentAvg =
            recent.reduce((sum, m) => sum + m.usagePercentage, 0) /
            recent.length;
        const olderAvg =
            older.reduce((sum, m) => sum + m.usagePercentage, 0) / older.length;

        const difference = recentAvg - olderAvg;

        if (difference > 5) return "declining";
        if (difference < -5) return "improving";
        return "stable";
    }

    async checkPerformanceThresholds(memoryInfo, cpuInfo) {
        const warnings = [];

        if (memoryInfo.usagePercentage > 90) {
            warnings.push("High memory usage detected");
        }

        if (cpuInfo.averageUsage > this.performanceThresholds.highCpuUsage) {
            warnings.push("High CPU usage detected");
        }

        if (
            memoryInfo.tabCount >
            this.performanceThresholds.maxTabsBeforeWarning
        ) {
            warnings.push(`High tab count: ${memoryInfo.tabCount} tabs open`);
        }

        if (warnings.length > 0) {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "ui/assets/icons/icon48.png",
                title: "BrowserGuard Pro - Performance Warning",
                message:
                    warnings.join(". ") + ". Consider suspending some tabs.",
            });
        }
    }

    // Data export methods
    async exportAnalyticsData() {
        const data = {
            memoryHistory: this.memoryHistory,
            cpuHistory: this.cpuHistory,
            suspensionStats: {
                ...this.suspensionStats,
                suspensionsByDomain: Object.fromEntries(
                    this.suspensionStats.suspensionsByDomain
                ),
            },
            healthScore: this.calculateHealthScore(),
            exportedAt: Date.now(),
        };

        return JSON.stringify(data, null, 2);
    }

    // Utility methods
    extractDomain(url) {
        try {
            return new URL(url).hostname.replace("www.", "");
        } catch {
            return "unknown";
        }
    }

    // API methods for UI
    getDashboardData() {
        return {
            healthScore: this.calculateHealthScore(),
            currentMetrics: this.getCurrentMetrics(),
            memoryChart: this.getMemoryChartData(),
            cpuChart: this.getCpuChartData(),
            suspensionStats: {
                ...this.suspensionStats,
                suspensionsByDomain: Object.fromEntries(
                    this.suspensionStats.suspensionsByDomain
                ),
            },
            topMemoryTabs: this.getTopMemoryTabs(),
            performanceTrend: this.getPerformanceTrend(),
        };
    }

    getMemoryChartData() {
        return this.memoryHistory.slice(-48).map((m) => ({
            timestamp: m.timestamp,
            usage: m.usagePercentage,
            tabCount: m.tabCount,
        }));
    }

    getCpuChartData() {
        return this.cpuHistory.slice(-48).map((c) => ({
            timestamp: c.timestamp,
            usage: c.averageUsage,
        }));
    }

    getTopMemoryTabs() {
        return Array.from(this.tabMetrics.values())
            .sort((a, b) => b.estimatedMemoryUsage - a.estimatedMemoryUsage)
            .slice(0, 10)
            .map((tab) => ({
                domain: tab.domain,
                title: tab.title,
                memoryUsage: tab.estimatedMemoryUsage,
                lastAccessed: tab.lastAccessed,
            }));
    }
}

// Export for use in background script
if (typeof module !== "undefined" && module.exports) {
    module.exports = PerformanceAnalytics;
}
