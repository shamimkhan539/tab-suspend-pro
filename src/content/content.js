// Content script for BrowserGuard Pro
// This script tracks user activity on pages and blocks YouTube ads

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
    let youtubeAdBlockerEnabled = false;

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

    // YouTube Ad Blocker
    function blockYouTubeAds() {
        if (!youtubeAdBlockerEnabled) return;

        const hostname = window.location.hostname;
        if (
            !hostname.includes("youtube.com") &&
            !hostname.includes("youtu.be") &&
            !hostname.includes("music.youtube.com")
        )
            return;

        // Remove ad elements
        function removeAds() {
            // Video ad player container
            const videoAds = document.querySelectorAll(
                ".ytp-ad-player-overlay, " +
                    ".ytp-player .ytp-ad-overlay, " +
                    ".video-ads, " +
                    "[data-ad-id], " +
                    'div[class*="ad-container"], ' +
                    "ytd-ad-slot-renderer, " +
                    ".ytd-ad-slot-renderer, " +
                    "yt-ad-slot-renderer"
            );

            videoAds.forEach((el) => {
                if (el && el.parentNode) {
                    el.remove();
                }
            });

            // Auto-click skip button if available
            const skipButtons = document.querySelectorAll(
                "button.ytp-ad-skip-button, " +
                    'button[aria-label*="Skip ad"], ' +
                    'button[aria-label*="Skip Ad"], ' +
                    ".ytp-ad-skip-button-modern, " +
                    'button[class*="skip"]'
            );

            skipButtons.forEach((btn) => {
                try {
                    if (btn && btn.offsetHeight > 0 && btn.offsetWidth > 0) {
                        btn.click();
                    }
                } catch (e) {
                    // Ignore click errors
                }
            });

            // Remove banner/promoted content ads
            const bannerAds = document.querySelectorAll(
                ".style-scope.ytd-banner-promo-renderer, " +
                    "ytd-banner-promo-renderer, " +
                    ".ytd-promoted-sparkles-renderer, " +
                    "ytd-rich-promotion-renderer, " +
                    '.yt-core-attributed-string[role="button"]:has-text("Ad"), ' +
                    '[aria-label*="sponsored"], ' +
                    '[aria-label*="Ad"], ' +
                    '.yt-simple-endpoint[role="button"] .yt-core-attributed-string'
            );

            bannerAds.forEach((el) => {
                try {
                    if (
                        el &&
                        el.parentNode &&
                        el.innerText &&
                        el.innerText.includes("Ad")
                    ) {
                        el.closest(
                            ".ytd-rich-item-renderer, .ytd-video-renderer, .yt-lockup-content"
                        ).remove();
                    }
                } catch (e) {
                    // Ignore removal errors
                }
            });

            // YouTube Music specific ads
            if (hostname.includes("music.youtube.com")) {
                const musicAds = document.querySelectorAll(
                    ".content-section.ad-section, " +
                        ".ad-container, " +
                        '[data-type="ad"], ' +
                        ".yt-ad, " +
                        ".ad-banner"
                );

                musicAds.forEach((el) => {
                    try {
                        if (el && el.parentNode) {
                            el.remove();
                        }
                    } catch (e) {
                        // Ignore
                    }
                });
            }

            // Mute/hide video player if showing ad overlay
            const adOverlay = document.querySelector(".ytp-ad-player-overlay");
            if (adOverlay) {
                const video = document.querySelector("video");
                if (video) {
                    video.muted = false;
                    video.play().catch(() => {
                        // Ignore play errors
                    });
                }
            }
        }

        // Run ad removal initially
        removeAds();

        // Use a combination of approaches
        // 1. MutationObserver for DOM changes
        let debounceTimer;
        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(removeAds, 100);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "data-ad-id", "aria-label"],
            attributeOldValue: false,
        });

        // 2. Periodic check
        setInterval(removeAds, 1000);
    }

    // Load YouTube blocker setting
    function loadYouTubeBlockerSettings() {
        try {
            chrome.runtime.sendMessage(
                { action: "get-youtube-blocker-settings" },
                (response) => {
                    if (response) {
                        youtubeAdBlockerEnabled =
                            response.blockYoutubeAds ||
                            response.blockYoutubeMusicAds ||
                            false;
                        if (youtubeAdBlockerEnabled) {
                            blockYouTubeAds();
                        }
                    }
                }
            );
        } catch (error) {
            console.log("YouTube blocker: Could not load settings");
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

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "update-youtube-blocker") {
            youtubeAdBlockerEnabled =
                request.blockYoutubeAds ||
                request.blockYoutubeMusicAds ||
                false;
            if (youtubeAdBlockerEnabled) {
                blockYouTubeAds();
            }
            sendResponse({ success: true });
        }
    });

    // Report activity immediately
    reportActivity();

    // Report activity every 30 seconds
    setInterval(reportActivity, 30000);

    // Load YouTube blocker settings
    setTimeout(() => loadYouTubeBlockerSettings(), 500);
})();
