/**
 * Security Utilities - Provides input validation, sanitization, and secure message handling
 * Ensures extension follows security best practices and OWASP guidelines
 */

class SecurityUtilities {
    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} Valid URL
     */
    static isValidUrl(url) {
        if (typeof url !== "string") return false;
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate domain format
     * @param {string} domain - Domain to validate
     * @returns {boolean} Valid domain
     */
    static isValidDomain(domain) {
        if (typeof domain !== "string") return false;
        const domainRegex =
            /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        return domainRegex.test(domain) && domain.length <= 253;
    }

    /**
     * Sanitize user input string
     * @param {string} input - Input to sanitize
     * @param {number} maxLength - Maximum length
     * @returns {string} Sanitized string
     */
    static sanitizeString(input, maxLength = 1000) {
        if (typeof input !== "string") return "";

        // Remove control characters and trim
        let sanitized = input
            .replace(/[\x00-\x1F\x7F]/g, "")
            .trim()
            .substring(0, maxLength);

        // Escape HTML special characters
        return sanitized
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#x27;")
            .replace(/\//g, "&#x2F;");
    }

    /**
     * Sanitize object (recursively)
     * @param {Object} obj - Object to sanitize
     * @param {number} maxDepth - Maximum nesting depth
     * @returns {Object} Sanitized object
     */
    static sanitizeObject(obj, maxDepth = 5) {
        if (maxDepth < 0) return null;
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== "object") return obj;

        if (Array.isArray(obj)) {
            return obj
                .slice(0, 1000)
                .map((item) => this.sanitizeObject(item, maxDepth - 1));
        }

        const sanitized = {};
        const keys = Object.keys(obj).slice(0, 100);

        for (const key of keys) {
            if (typeof key === "string" && key.length <= 100) {
                sanitized[this.sanitizeString(key)] = this.sanitizeObject(
                    obj[key],
                    maxDepth - 1
                );
            }
        }

        return sanitized;
    }

    /**
     * Validate and sanitize message from content script
     * @param {Object} message - Message object
     * @param {string} expectedAction - Expected action type
     * @returns {Object|null} Validated message or null
     */
    static validateMessage(message, expectedAction = null) {
        if (!message || typeof message !== "object") {
            return null;
        }

        // Check action
        if (
            !message.action ||
            typeof message.action !== "string" ||
            message.action.length > 100
        ) {
            return null;
        }

        // Verify expected action if specified
        if (expectedAction && message.action !== expectedAction) {
            return null;
        }

        // Sanitize the entire message
        return this.sanitizeObject(message);
    }

    /**
     * Generate secure random token
     * @param {number} length - Token length in bytes
     * @returns {string} Hex token
     */
    static generateToken(length = 32) {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (byte) =>
            byte.toString(16).padStart(2, "0")
        ).join("");
    }

    /**
     * Hash string using SHA-256
     * @param {string} str - String to hash
     * @returns {Promise} Hex hash
     */
    static async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    /**
     * Validate JSON string
     * @param {string} jsonStr - JSON string to validate
     * @returns {Object|null} Parsed object or null
     */
    static parseJSON(jsonStr) {
        if (typeof jsonStr !== "string") return null;

        try {
            const obj = JSON.parse(jsonStr);
            // Ensure result is valid object
            if (typeof obj === "object" && obj !== null) {
                return obj;
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Check if URL is from trusted origin
     * @param {string} url - URL to check
     * @param {Array} trustedOrigins - List of trusted origins
     * @returns {boolean} Is trusted
     */
    static isTrustedOrigin(url, trustedOrigins = []) {
        if (!this.isValidUrl(url)) return false;

        try {
            const urlObj = new URL(url);
            return trustedOrigins.some((origin) => {
                try {
                    const originObj = new URL(origin);
                    return urlObj.origin === originObj.origin;
                } catch {
                    return false;
                }
            });
        } catch {
            return false;
        }
    }

    /**
     * Sanitize file name
     * @param {string} filename - File name to sanitize
     * @returns {string} Safe file name
     */
    static sanitizeFilename(filename) {
        if (typeof filename !== "string") return "file";

        return filename
            .replace(/[^a-zA-Z0-9.-]/g, "_")
            .replace(/\.{2,}/g, ".")
            .substring(0, 255)
            .replace(/^\.+/, "") // Remove leading dots
            .replace(/\s+/g, "_"); // Replace spaces
    }

    /**
     * Validate regex pattern
     * @param {string} pattern - Regex pattern
     * @returns {boolean} Valid pattern
     */
    static isValidRegex(pattern) {
        if (typeof pattern !== "string") return false;

        try {
            new RegExp(pattern);
            return pattern.length <= 1000;
        } catch {
            return false;
        }
    }

    /**
     * Rate limit check
     * @param {string} key - Rate limit key
     * @param {number} maxRequests - Max requests allowed
     * @param {number} windowMs - Time window in ms
     * @returns {boolean} Is within limit
     */
    static checkRateLimit(key, maxRequests = 100, windowMs = 60000) {
        if (!this.rateLimitMap) {
            this.rateLimitMap = new Map();
        }

        const now = Date.now();
        const window = this.rateLimitMap.get(key) || [];

        // Remove old entries
        const filtered = window.filter((time) => now - time < windowMs);

        if (filtered.length >= maxRequests) {
            return false; // Rate limit exceeded
        }

        filtered.push(now);
        this.rateLimitMap.set(key, filtered);
        return true; // Within limit
    }

    /**
     * Validate and sanitize URL parameters
     * @param {string} url - URL to extract params from
     * @returns {Object} Sanitized parameters
     */
    static extractAndSanitizeParams(url) {
        if (!this.isValidUrl(url)) return {};

        try {
            const urlObj = new URL(url);
            const params = {};

            for (const [key, value] of urlObj.searchParams) {
                if (key.length <= 100 && value.length <= 1000) {
                    params[this.sanitizeString(key)] =
                        this.sanitizeString(value);
                }
            }

            return params;
        } catch {
            return {};
        }
    }

    /**
     * Check if data is potentially harmful
     * @param {any} data - Data to check
     * @returns {boolean} Is potentially harmful
     */
    static isPotentiallyHarmful(data) {
        if (typeof data === "string") {
            const harmful = [
                "javascript:",
                "data:",
                "<script",
                "onerror=",
                "onclick=",
                "eval(",
                "function(",
                "constructor",
            ];

            const lower = data.toLowerCase();
            return harmful.some((h) => lower.includes(h));
        }

        return false;
    }

    /**
     * Validate array of items with schema
     * @param {Array} items - Items to validate
     * @param {Object} schema - Schema object with type checking
     * @returns {Array} Valid items
     */
    static validateArray(items, schema = {}) {
        if (!Array.isArray(items)) return [];

        return items.filter((item) => {
            if (!item || typeof item !== "object") return false;

            for (const [key, expectedType] of Object.entries(schema)) {
                if (typeof item[key] !== expectedType) return false;
            }

            return true;
        });
    }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
    module.exports = SecurityUtilities;
}
