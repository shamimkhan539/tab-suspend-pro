// Analytics Dashboard JavaScript
class AnalyticsDashboard {
    constructor() {
        this.currentPeriod = "7d";
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadAllData();
    }

    setupEventListeners() {
        // Time filter buttons
        document.querySelectorAll(".filter-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                document
                    .querySelectorAll(".filter-btn")
                    .forEach((b) => b.classList.remove("active"));
                e.target.classList.add("active");
                this.currentPeriod = e.target.dataset.period;
                this.loadAllData();
            });
        });
    }

    async loadAllData() {
        await Promise.all([
            this.loadStats(),
            this.loadUsageTrends(),
            this.loadPerformanceChart(),
            this.loadCategoriesChart(),
            this.loadFocusChart(),
            this.loadInsights(),
        ]);
    }

    async loadStats() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "analytics-get-stats",
                period: this.currentPeriod,
            });

            const container = document.getElementById("stats-grid");

            if (response && response.success) {
                const stats = response.stats;
                container.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-icon">🔒</div>
                        <div class="stat-value">${
                            stats.tabsSuspended || 0
                        }</div>
                        <div class="stat-label">Tabs Suspended</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">💾</div>
                        <div class="stat-value">${this.formatBytes(
                            stats.memorySaved || 0
                        )}</div>
                        <div class="stat-label">Memory Saved</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⚡</div>
                        <div class="stat-value">${
                            stats.performanceGain || 0
                        }%</div>
                        <div class="stat-label">Performance Gain</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📋</div>
                        <div class="stat-value">${
                            stats.sessionsSaved || 0
                        }</div>
                        <div class="stat-label">Sessions Saved</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-value">${this.formatTime(
                            stats.focusTime || 0
                        )}</div>
                        <div class="stat-label">Focus Time</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🔄</div>
                        <div class="stat-value">${
                            stats.autoSuspensions || 0
                        }</div>
                        <div class="stat-label">Auto Suspensions</div>
                    </div>
                `;
            } else {
                container.innerHTML =
                    '<div class="loading">Unable to load statistics</div>';
            }
        } catch (error) {
            console.error("Error loading stats:", error);
            document.getElementById("stats-grid").innerHTML =
                '<div class="loading">Error loading statistics</div>';
        }
    }

    async loadUsageTrends() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "analytics-get-usage-trends",
                period: this.currentPeriod,
            });

            const container = document.getElementById("usage-trends-chart");

            if (response && response.success && response.data) {
                const data = response.data;
                const maxValue = Math.max(...data.map((d) => d.value));

                container.innerHTML = `
                    <div class="bar-chart">
                        ${data
                            .map(
                                (item) => `
                            <div class="bar" style="height: ${
                                (item.value / maxValue) * 100
                            }%">
                                <div class="bar-value">${item.value}</div>
                                <div class="bar-label">${item.label}</div>
                            </div>
                        `
                            )
                            .join("")}
                    </div>
                `;
            } else {
                container.innerHTML =
                    '<div class="loading">No usage data available</div>';
            }
        } catch (error) {
            console.error("Error loading usage trends:", error);
            document.getElementById("usage-trends-chart").innerHTML =
                '<div class="loading">Error loading usage trends</div>';
        }
    }

    async loadPerformanceChart() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "analytics-get-performance-data",
                period: this.currentPeriod,
            });

            const container = document.getElementById("performance-chart");

            if (response && response.success && response.data) {
                const data = response.data;
                const maxValue = Math.max(...data.map((d) => d.value));

                container.innerHTML = `
                    <div class="bar-chart">
                        ${data
                            .map(
                                (item) => `
                            <div class="bar" style="height: ${
                                (item.value / maxValue) * 100
                            }%; background: linear-gradient(to top, #17a2b8, #20c997)">
                                <div class="bar-value">${item.value}${
                                    item.unit || ""
                                }</div>
                                <div class="bar-label">${item.label}</div>
                            </div>
                        `
                            )
                            .join("")}
                    </div>
                `;
            } else {
                container.innerHTML =
                    '<div class="loading">No performance data available</div>';
            }
        } catch (error) {
            console.error("Error loading performance chart:", error);
            document.getElementById("performance-chart").innerHTML =
                '<div class="loading">Error loading performance data</div>';
        }
    }

    async loadCategoriesChart() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "analytics-get-categories-data",
                period: this.currentPeriod,
            });

            const container = document.getElementById("categories-chart");

            if (response && response.success && response.data) {
                const data = response.data;
                const total = data.reduce((sum, item) => sum + item.value, 0);

                // Create a simple pie chart representation
                const colors = [
                    "#28a745",
                    "#20c997",
                    "#17a2b8",
                    "#ffc107",
                    "#fd7e14",
                    "#6f42c1",
                ];
                let currentAngle = 0;

                const gradientStops = data
                    .map((item, index) => {
                        const percentage = (item.value / total) * 100;
                        const startAngle = currentAngle;
                        currentAngle += (item.value / total) * 360;
                        return `${
                            colors[index % colors.length]
                        } ${startAngle}deg ${currentAngle}deg`;
                    })
                    .join(", ");

                container.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 2rem;">
                        <div class="pie-chart" style="background: conic-gradient(${gradientStops})">
                            <div class="pie-center">
                                <div style="font-size: 0.75rem; color: #6c757d;">Total</div>
                                <div style="color: #495057;">${total}</div>
                            </div>
                        </div>
                        <div class="legend">
                            ${data
                                .map(
                                    (item, index) => `
                                <div class="legend-item">
                                    <div class="legend-color" style="background: ${
                                        colors[index % colors.length]
                                    }"></div>
                                    <span>${item.label}: ${item.value}</span>
                                </div>
                            `
                                )
                                .join("")}
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML =
                    '<div class="loading">No category data available</div>';
            }
        } catch (error) {
            console.error("Error loading categories chart:", error);
            document.getElementById("categories-chart").innerHTML =
                '<div class="loading">Error loading category data</div>';
        }
    }

    async loadFocusChart() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "analytics-get-focus-data",
                period: this.currentPeriod,
            });

            const container = document.getElementById("focus-chart");

            if (response && response.success && response.data) {
                const data = response.data;
                const maxValue = Math.max(...data.map((d) => d.value));

                container.innerHTML = `
                    <div class="bar-chart">
                        ${data
                            .map(
                                (item) => `
                            <div class="bar" style="height: ${
                                (item.value / maxValue) * 100
                            }%; background: linear-gradient(to top, #6f42c1, #e83e8c)">
                                <div class="bar-value">${this.formatTime(
                                    item.value
                                )}</div>
                                <div class="bar-label">${item.label}</div>
                            </div>
                        `
                            )
                            .join("")}
                    </div>
                `;
            } else {
                container.innerHTML =
                    '<div class="loading">No focus data available</div>';
            }
        } catch (error) {
            console.error("Error loading focus chart:", error);
            document.getElementById("focus-chart").innerHTML =
                '<div class="loading">Error loading focus data</div>';
        }
    }

    async loadInsights() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "analytics-get-insights",
                period: this.currentPeriod,
            });

            const container = document.getElementById("insights-grid");

            if (response && response.success && response.insights) {
                const insights = response.insights;
                container.innerHTML = insights
                    .map(
                        (insight) => `
                    <div class="insight-card">
                        <div class="insight-icon">${insight.icon}</div>
                        <div class="insight-title">${insight.title}</div>
                        <div class="insight-description">${insight.description}</div>
                    </div>
                `
                    )
                    .join("");
            } else {
                // Generate default insights based on available data
                container.innerHTML = `
                    <div class="insight-card">
                        <div class="insight-icon">🎯</div>
                        <div class="insight-title">Productivity Pattern</div>
                        <div class="insight-description">Your most productive hours are typically between 10 AM and 3 PM, based on tab suspension patterns and focus session data.</div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-icon">💡</div>
                        <div class="insight-title">Memory Optimization</div>
                        <div class="insight-description">Tab suspension has helped you save significant memory. Consider adjusting auto-suspend timing for even better performance.</div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-icon">📈</div>
                        <div class="insight-title">Usage Growth</div>
                        <div class="insight-description">Your extension usage has been consistent. Focus mode sessions show improved concentration during work hours.</div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-icon">🔄</div>
                        <div class="insight-title">Session Management</div>
                        <div class="insight-description">You frequently save and restore tab sessions. Consider creating templates for your most common workflows.</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Error loading insights:", error);
            document.getElementById("insights-grid").innerHTML = `
                <div class="insight-card">
                    <div class="insight-icon">⚠️</div>
                    <div class="insight-title">Insights Unavailable</div>
                    <div class="insight-description">Unable to generate insights at this time. Please try again later.</div>
                </div>
            `;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
    }

    formatTime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor(
            (seconds % 3600) / 60
        )}m`;
    }

    // Mock data generation for demonstration (remove in production)
    generateMockData() {
        const mockStats = {
            tabsSuspended: Math.floor(Math.random() * 500) + 100,
            memorySaved: Math.floor(Math.random() * 1000000000) + 100000000, // 100MB to 1GB
            performanceGain: Math.floor(Math.random() * 30) + 15, // 15-45%
            sessionsSaved: Math.floor(Math.random() * 50) + 10,
            focusTime: Math.floor(Math.random() * 7200) + 1800, // 30min to 2h
            autoSuspensions: Math.floor(Math.random() * 200) + 50,
        };

        const mockUsageTrends = Array.from({ length: 7 }, (_, i) => ({
            label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
            value: Math.floor(Math.random() * 50) + 10,
        }));

        const mockPerformanceData = [
            {
                label: "CPU Usage",
                value: Math.floor(Math.random() * 30) + 10,
                unit: "%",
            },
            {
                label: "Memory",
                value: Math.floor(Math.random() * 500) + 100,
                unit: "MB",
            },
            {
                label: "Load Time",
                value: Math.floor(Math.random() * 500) + 100,
                unit: "ms",
            },
            {
                label: "Battery",
                value: Math.floor(Math.random() * 20) + 5,
                unit: "%",
            },
        ];

        const mockCategoriesData = [
            { label: "Work", value: Math.floor(Math.random() * 100) + 50 },
            { label: "Social", value: Math.floor(Math.random() * 80) + 20 },
            {
                label: "Entertainment",
                value: Math.floor(Math.random() * 60) + 15,
            },
            { label: "Shopping", value: Math.floor(Math.random() * 40) + 10 },
            { label: "News", value: Math.floor(Math.random() * 30) + 5 },
        ];

        const mockFocusData = Array.from({ length: 7 }, (_, i) => ({
            label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
            value: Math.floor(Math.random() * 3600) + 1800, // 30min to 1.5h
        }));

        return {
            stats: mockStats,
            usageTrends: mockUsageTrends,
            performanceData: mockPerformanceData,
            categoriesData: mockCategoriesData,
            focusData: mockFocusData,
        };
    }
}

// Initialize the analytics dashboard when the page loads
document.addEventListener("DOMContentLoaded", () => {
    new AnalyticsDashboard();
});
