/**
 * Enhanced Logger - Provides structured error tracking, logging, and diagnostics
 * Helps identify and troubleshoot issues across the extension
 */

class EnhancedLogger {
    constructor(moduleName = "Global") {
        this.moduleName = moduleName;
        this.errorLog = [];
        this.warningLog = [];
        this.infoLog = [];
        this.performanceMetrics = new Map();
        this.maxLogSize = 500; // Keep last 500 entries per level
        this.isDebugMode = false;

        // Try to load debug mode from storage
        chrome.storage.local.get(["debugMode"], (result) => {
            if (result.debugMode) {
                this.isDebugMode = true;
            }
        });
    }

    /**
     * Set debug mode
     * @param {boolean} enabled - Enable/disable debug logging
     */
    setDebugMode(enabled) {
        this.isDebugMode = enabled;
    }

    /**
     * Log an error with context
     * @param {string} message - Error message
     * @param {Error} error - Error object
     * @param {Object} context - Additional context
     */
    error(message, error = null, context = {}) {
        const entry = {
            timestamp: Date.now(),
            module: this.moduleName,
            message,
            error: error
                ? {
                      name: error.name,
                      message: error.message,
                      stack: error.stack,
                  }
                : null,
            context,
            url: typeof window !== "undefined" ? window.location.href : "N/A",
        };

        this.errorLog.push(entry);
        this.trimLog("error");

        // Log to console with styling
        console.error(
            `%c[ERROR] ${this.moduleName}%c ${message}`,
            "color: #ff6b6b; font-weight: bold;",
            "color: inherit;",
            error || context
        );

        // Store in extension storage for debugging
        this.saveToStorage("errors", entry);
    }

    /**
     * Log a warning
     * @param {string} message - Warning message
     * @param {Object} context - Additional context
     */
    warn(message, context = {}) {
        const entry = {
            timestamp: Date.now(),
            module: this.moduleName,
            message,
            context,
        };

        this.warningLog.push(entry);
        this.trimLog("warning");

        if (this.isDebugMode) {
            console.warn(
                `%c[WARN] ${this.moduleName}%c ${message}`,
                "color: #ffd93d; font-weight: bold;",
                "color: inherit;",
                context
            );
        }
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} data - Additional data
     */
    info(message, data = {}) {
        if (!this.isDebugMode) return;

        const entry = {
            timestamp: Date.now(),
            module: this.moduleName,
            message,
            data,
        };

        this.infoLog.push(entry);
        this.trimLog("info");

        console.log(
            `%c[INFO] ${this.moduleName}%c ${message}`,
            "color: #6bcf7f; font-weight: bold;",
            "color: inherit;",
            data
        );
    }

    /**
     * Start performance measurement
     * @param {string} label - Measurement label
     * @returns {Function} Function to call to end measurement
     */
    startTimer(label) {
        const startTime = performance.now();
        return () => {
            const duration = performance.now() - startTime;
            this.recordMetric(label, duration);
            return duration;
        };
    }

    /**
     * Record a performance metric
     * @param {string} metric - Metric name
     * @param {number} value - Metric value
     */
    recordMetric(metric, value) {
        if (!this.performanceMetrics.has(metric)) {
            this.performanceMetrics.set(metric, []);
        }

        const values = this.performanceMetrics.get(metric);
        values.push(value);

        // Keep only last 100 measurements
        if (values.length > 100) {
            values.shift();
        }
    }

    /**
     * Get performance metric statistics
     * @param {string} metric - Metric name
     * @returns {Object} Statistics
     */
    getMetricStats(metric) {
        if (!this.performanceMetrics.has(metric)) {
            return null;
        }

        const values = this.performanceMetrics.get(metric);
        if (values.length === 0) return null;

        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;

        return {
            count: values.length,
            min: sorted[0],
            max: sorted[values.length - 1],
            avg: avg.toFixed(2),
            median: sorted[Math.floor(values.length / 2)].toFixed(2),
            p95: sorted[Math.floor(values.length * 0.95)].toFixed(2),
        };
    }

    /**
     * Get all logs
     * @returns {Object} All logs organized by level
     */
    getAllLogs() {
        return {
            errors: this.errorLog.slice(-50),
            warnings: this.warningLog.slice(-50),
            info: this.infoLog.slice(-50),
            metrics: Array.from(this.performanceMetrics.entries()).map(
                ([name, values]) => ({
                    name,
                    stats: this.getMetricStats(name),
                })
            ),
        };
    }

    /**
     * Clear all logs
     */
    clearAllLogs() {
        this.errorLog = [];
        this.warningLog = [];
        this.infoLog = [];
        this.performanceMetrics.clear();
    }

    /**
     * Trim log to maintain size limit
     * @param {string} level - Log level
     * @private
     */
    trimLog(level) {
        const log =
            level === "error"
                ? this.errorLog
                : level === "warning"
                ? this.warningLog
                : this.infoLog;

        if (log.length > this.maxLogSize) {
            log.splice(0, log.length - this.maxLogSize);
        }
    }

    /**
     * Save log entry to extension storage
     * @param {string} type - Log type
     * @param {Object} entry - Log entry
     * @private
     */
    saveToStorage(type, entry) {
        chrome.storage.local.get([type], (result) => {
            const logs = (result[type] || []).slice(-99); // Keep last 100
            logs.push(entry);
            chrome.storage.local.set({ [type]: logs });
        });
    }

    /**
     * Create error boundary wrapper
     * @param {Function} fn - Function to wrap
     * @param {string} label - Operation label
     * @returns {Function} Wrapped function
     */
    withErrorBoundary(fn, label) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.error(`Error in ${label}`, error, { args });
                throw error;
            }
        };
    }

    /**
     * Assert condition, log error if false
     * @param {boolean} condition - Condition to check
     * @param {string} message - Message if false
     */
    assert(condition, message) {
        if (!condition) {
            this.error(`Assertion failed: ${message}`);
        }
    }

    /**
     * Get system diagnostics
     * @returns {Promise} Diagnostics object
     */
    async getDiagnostics() {
        return new Promise((resolve) => {
            chrome.system.memory.getInfo((memInfo) => {
                resolve({
                    timestamp: Date.now(),
                    memory: memInfo,
                    logs: {
                        errorCount: this.errorLog.length,
                        warningCount: this.warningLog.length,
                        infoCount: this.infoLog.length,
                    },
                    metrics: Object.fromEntries(
                        Array.from(this.performanceMetrics.entries()).map(
                            ([name, values]) => [
                                name,
                                this.getMetricStats(name),
                            ]
                        )
                    ),
                    debugMode: this.isDebugMode,
                });
            });
        });
    }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
    module.exports = EnhancedLogger;
}
