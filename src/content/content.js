// Content script for BrowserGuard Pro
// This script tracks user activity on pages

(function () {
    "use strict";

    // Only run on regular web pages, not on extension pages or suspended pages
    if (
        window.location.href.startsWith("chrome-extension://") ||
        window.location.href.includes("suspended.html")
    ) {
        return;
    }

    let lastActivity = Date.now();
    let isActive = true;

    const activityEvents = [
        "mousedown",
        "mousemove",
        "keypress",
        "scroll",
        "touchstart",
        "click",
        "focus",
        "blur",
    ];

    function updateActivity() {
        lastActivity = Date.now();
        isActive = true;
    }

    function reportActivity() {
        // Only report if we're on a regular web page
        if (
            window.location.href.startsWith("chrome-extension://") ||
            window.location.href.includes("suspended.html")
        ) {
            return;
        }

        // Send activity status to background script with error handling
        try {
            chrome.runtime
                .sendMessage({
                    action: "updateActivity",
                    lastActivity: lastActivity,
                    isActive: isActive,
                })
                .catch(() => {
                    // Silently ignore errors if extension context is invalid
                });
        } catch (error) {
            // Ignore errors silently
        }
    }

    // Setup activity listeners
    activityEvents.forEach((event) => {
        document.addEventListener(event, updateActivity, { passive: true });
    });

    // Listen for visibility changes
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            updateActivity();
        }
    });

    // Listen for focus events
    window.addEventListener("focus", updateActivity);

    // Report activity immediately
    reportActivity();

    // Report activity every 30 seconds
    setInterval(reportActivity, 30000);
})();
