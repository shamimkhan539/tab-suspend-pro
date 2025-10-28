/**
 * Performance Optimizer - Provides caching, debouncing, and request batching
 * Reduces memory usage and improves response times across the extension
 */

class PerformanceOptimizer {
    constructor() {
        // Cache configuration
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.pendingRequests = new Map();
        this.debounceTimers = new Map();
        this.batchQueue = new Map();

        // Default cache durations (ms)
        this.DEFAULT_CACHE_DURATION = 60000; // 1 minute
        this.SETTINGS_CACHE_DURATION = 300000; // 5 minutes
        this.STATS_CACHE_DURATION = 30000; // 30 seconds
    }

    /**
     * Get or set a cached value with expiration
     * @param {string} key - Cache key
     * @param {Function} getter - Async function to get value if not cached
     * @param {number} duration - Cache duration in ms
     * @returns {Promise} Cached or fetched value
     */
    async withCache(key, getter, duration = this.DEFAULT_CACHE_DURATION) {
        const now = Date.now();
        const expiry = this.cacheExpiry.get(key);

        // Return cached value if not expired
        if (this.cache.has(key) && expiry && expiry > now) {
            return this.cache.get(key);
        }

        // Deduplicate requests - if request is pending, return the same promise
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }

        // Fetch new value
        const promise = getter()
            .then((value) => {
                this.cache.set(key, value);
                this.cacheExpiry.set(key, now + duration);
                this.pendingRequests.delete(key);
                return value;
            })
            .catch((error) => {
                this.pendingRequests.delete(key);
                throw error;
            });

        this.pendingRequests.set(key, promise);
        return promise;
    }

    /**
     * Debounce a function - delays execution until after wait ms
     * @param {string} key - Unique identifier for this debounced function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Delay in ms
     * @param {any} context - Context to bind 'this'
     * @returns {Function} Debounced function
     */
    debounce(key, func, wait = 300, context = null) {
        return (...args) => {
            // Clear previous timer
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }

            // Set new timer
            const timer = setTimeout(() => {
                func.apply(context, args);
                this.debounceTimers.delete(key);
            }, wait);

            this.debounceTimers.set(key, timer);
        };
    }

    /**
     * Throttle a function - execute at most once per wait ms
     * @param {string} key - Unique identifier
     * @param {Function} func - Function to throttle
     * @param {number} wait - Minimum interval between calls in ms
     * @param {any} context - Context to bind 'this'
     * @returns {Function} Throttled function
     */
    throttle(key, func, wait = 300, context = null) {
        let lastCall = 0;
        let lastTimer = null;

        return (...args) => {
            const now = Date.now();
            const timeSinceLastCall = now - lastCall;

            if (timeSinceLastCall >= wait) {
                lastCall = now;
                func.apply(context, args);
            } else if (!lastTimer) {
                lastTimer = setTimeout(() => {
                    lastCall = Date.now();
                    func.apply(context, args);
                    lastTimer = null;
                }, wait - timeSinceLastCall);
            }
        };
    }

    /**
     * Batch multiple requests into a single operation
     * @param {string} key - Batch identifier
     * @param {Function} processor - Async function to process batched items
     * @param {any} item - Item to add to batch
     * @param {number} maxWait - Maximum wait before processing
     * @returns {Promise} Result of batched operation
     */
    async batch(key, processor, item, maxWait = 100) {
        if (!this.batchQueue.has(key)) {
            this.batchQueue.set(key, {
                items: [],
                promise: null,
                timer: null,
                resolves: [],
                rejects: [],
            });
        }

        const batch = this.batchQueue.get(key);
        batch.items.push(item);

        // Return existing promise if batch is already being processed
        if (batch.promise) {
            return new Promise((resolve, reject) => {
                batch.resolves.push(resolve);
                batch.rejects.push(reject);
            });
        }

        // Create promise for this batch
        batch.promise = new Promise((resolve, reject) => {
            batch.resolves.push(resolve);
            batch.rejects.push(reject);

            // Process batch after maxWait or if batch reaches threshold
            const processBatch = async () => {
                try {
                    const items = batch.items.slice();
                    batch.items = [];
                    batch.timer = null;

                    const result = await processor(items);

                    const resolves = batch.resolves;
                    batch.resolves = [];
                    batch.promise = null;

                    resolves.forEach((r) => r(result));
                } catch (error) {
                    const rejects = batch.rejects;
                    batch.rejects = [];
                    batch.promise = null;

                    rejects.forEach((r) => r(error));
                }
            };

            // Set timer for next batch processing
            if (!batch.timer) {
                batch.timer = setTimeout(processBatch, maxWait);
            }

            // Process immediately if batch is large
            if (batch.items.length >= 10) {
                clearTimeout(batch.timer);
                processBatch();
            }
        });

        return batch.promise;
    }

    /**
     * Clear specific cache entry
     * @param {string} key - Cache key to clear
     */
    clearCache(key) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
    }

    /**
     * Clear all caches
     */
    clearAllCaches() {
        this.cache.clear();
        this.cacheExpiry.clear();
        this.pendingRequests.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        const now = Date.now();
        let activeCacheCount = 0;
        let expiredCacheCount = 0;

        for (const [key, expiry] of this.cacheExpiry.entries()) {
            if (expiry > now) {
                activeCacheCount++;
            } else {
                expiredCacheCount++;
            }
        }

        return {
            activeCaches: activeCacheCount,
            expiredCaches: expiredCacheCount,
            pendingRequests: this.pendingRequests.size,
            batchQueues: this.batchQueue.size,
            totalMemory: this.estimateMemoryUsage(),
        };
    }

    /**
     * Estimate memory usage of cached data
     * @returns {number} Estimated bytes
     */
    estimateMemoryUsage() {
        let bytes = 0;
        for (const [key, value] of this.cache.entries()) {
            bytes += key.length * 2; // String length estimate
            bytes += JSON.stringify(value).length; // Value size estimate
        }
        return bytes;
    }

    /**
     * Request deduplication - ensures same request isn't made twice
     * @param {string} key - Request identifier
     * @param {Function} request - Async request function
     * @returns {Promise} Request result
     */
    async deduplicateRequest(key, request) {
        // Return existing request if pending
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }

        // Make new request
        const promise = request()
            .then((result) => {
                this.pendingRequests.delete(key);
                return result;
            })
            .catch((error) => {
                this.pendingRequests.delete(key);
                throw error;
            });

        this.pendingRequests.set(key, promise);
        return promise;
    }

    /**
     * Lazy load a module only when needed
     * @param {string} moduleName - Name of module
     * @param {Function} loader - Async function to load module
     * @returns {Promise} Loaded module
     */
    async lazyLoad(moduleName, loader) {
        const cacheKey = `lazy-load-${moduleName}`;
        return this.withCache(cacheKey, loader, this.DEFAULT_CACHE_DURATION);
    }

    /**
     * Schedule a task with exponential backoff retry
     * @param {Function} task - Async task to execute
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} baseDelay - Base delay in ms
     * @returns {Promise} Task result
     */
    async retryWithBackoff(task, maxRetries = 3, baseDelay = 100) {
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await task();
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }
}

// Create global instance
const performanceOptimizer = new PerformanceOptimizer();

// Export for use
if (typeof module !== "undefined" && module.exports) {
    module.exports = PerformanceOptimizer;
}
