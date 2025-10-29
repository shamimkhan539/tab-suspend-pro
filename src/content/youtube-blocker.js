// YouTube Ad Blocker - Based on JAdSkip's proven approach
// Strategy: Skip ads via player API, not DOM manipulation

(function () {
    "use strict";

    const hostname = window.location.hostname;
    const isYouTube =
        hostname.includes("youtube.com") || hostname.includes("youtu.be");
    const isYouTubeMusic = hostname.includes("music.youtube.com");

    if (!isYouTube && !isYouTubeMusic) {
        return;
    }

    console.log("[YouTube Blocker] Initialized on", hostname);

    let blockEnabled = false;
    let adSlots = [];
    let lastBlockedAdURL = "";
    let processedAds = new Set(); // Track processed ads by timestamp and position
    let adCheckCount = 0; // Counter for aggressive checking
    let lastCheckTime = 0; // Track last check to avoid redundant checks
    let isVideoPlaying = false; // Track if video is currently playing
    let lastAdDetectedTime = 0; // Track when ad was last detected
    let lastAdStartTime = 0; // Track when ad was first detected (for aggressive checking during ads)
    let isCurrentlyPlayingAd = false; // Flag to know if ad is actively playing
    let aggressiveCheckMode = false; // When true, check every 300ms instead of 800ms
    let lastVideoTime = -1; // Track last video position to detect ads
    let videoPositionBeforeAd = -1; // Store original video position when ad starts (CRITICAL FIX)
    let lastKnownGoodPosition = 0; // Track last known good playback position
    let isSkippingAd = false; // Flag to know when we're in the middle of skipping

    // Function to load settings from background
    async function loadSettings() {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage(
                    { action: "get-youtube-blocker-settings" },
                    function (response) {
                        if (chrome.runtime.lastError) {
                            console.log(
                                "[YouTube Blocker] Error getting settings:",
                                chrome.runtime.lastError
                            );
                            resolve(false);
                            return;
                        }

                        if (response) {
                            blockEnabled =
                                isYouTube && response.blockYoutubeAds
                                    ? true
                                    : isYouTubeMusic &&
                                      response.blockYoutubeMusicAds
                                    ? true
                                    : false;
                            console.log("[YouTube Blocker] Settings loaded:", {
                                blockEnabled,
                                blockYoutubeAds: response.blockYoutubeAds,
                                blockYoutubeMusicAds:
                                    response.blockYoutubeMusicAds,
                                isYouTube,
                                isYouTubeMusic,
                                hostname,
                            });
                            resolve(true);
                        } else {
                            console.log(
                                "[YouTube Blocker] No response from background"
                            );
                            resolve(false);
                        }
                    }
                );
            } catch (error) {
                console.log("[YouTube Blocker] Error sending message:", error);
                resolve(false);
            }
        });
    }

    // Load settings immediately with retry logic
    let retryCount = 0;
    const maxRetries = 5;

    async function loadSettingsWithRetry() {
        const success = await loadSettings();
        if (!success && retryCount < maxRetries) {
            retryCount++;
            console.log(
                `[YouTube Blocker] Retry ${retryCount}/${maxRetries} in 500ms...`
            );
            setTimeout(loadSettingsWithRetry, 500);
        } else if (success) {
            console.log("[YouTube Blocker] Settings loaded successfully");
        } else {
            console.log(
                "[YouTube Blocker] Failed to load settings after " +
                    maxRetries +
                    " retries"
            );
        }
    }

    loadSettingsWithRetry();

    // Get ad player element (the video playing ads) - try multiple selectors
    function getAdPlayer() {
        try {
            // Try multiple player selectors
            let player = document.querySelector(".html5-main-video");
            if (!player) player = document.querySelector("video");
            if (!player) {
                const videos = document.querySelectorAll("video");
                if (videos.length > 0) {
                    player = videos[0];
                }
            }
            return player && player.tagName === "VIDEO" ? player : null;
        } catch (e) {
            return null;
        }
    }

    // Detect if we're currently in an ad
    function isAdPlaying() {
        try {
            const player = document.querySelector("#movie_player");
            if (!player) return false;

            // Check for ad-related classes
            const classList = player.className || "";
            if (classList.includes("ad-showing") || classList.includes("ad")) {
                return true;
            }

            // Check for ad UI elements
            const adOverlay = document.querySelector(".ytp-ad-player-overlay");
            const adMessage = document.querySelector(
                ".ytp-ad-message-container"
            );
            if (adOverlay?.offsetHeight > 0 || adMessage?.offsetHeight > 0) {
                return true;
            }

            return false;
        } catch (e) {
            return false;
        }
    }

    // Skip ad by seeking to end - more aggressive approach
    async function trySkipAd() {
        if (!blockEnabled) return;

        const player = getAdPlayer();
        if (!player) return;

        try {
            // Check if this is an ad (ads have shorter durations typically)
            if (!isFinite(player.duration) || player.duration <= 0) {
                return;
            }

            // Create unique ad identifier using BOTH duration, current time, AND a timestamp
            // This allows us to track different ads even with similar durations
            const timestamp = Date.now();
            const adId = `${Math.round(player.duration)}_${Math.round(
                player.currentTime * 10
            )}_${Math.floor(timestamp / 1000)}`;

            // If already processed this specific ad configuration within last 5 seconds, skip
            let shouldSkip = false;
            for (const processed of processedAds) {
                const [duration, time, ts] = processed.split("_");
                const timeSinceProcessed = timestamp - parseInt(ts) * 1000;
                if (
                    duration === Math.round(player.duration).toString() &&
                    timeSinceProcessed < 5000
                ) {
                    shouldSkip = true;
                    break;
                }
            }

            // For video ads: seek aggressively to skip
            // Increased from 90 to 120 seconds to catch more ad types
            if (player.duration < 120) {
                // Video ads are usually < 120 seconds (covering most pre-roll, mid-roll, bumper ads)
                if (!shouldSkip) {
                    // CRITICAL FIX: Store original video position BEFORE seeking to skip ad
                    if (
                        videoPositionBeforeAd === -1 &&
                        player.currentTime < player.duration * 0.95
                    ) {
                        // Only store position if we haven't already and we're not already near end of ad
                        videoPositionBeforeAd = player.currentTime;
                        console.log(
                            `[YouTube Blocker] 📍 Stored video position: ${videoPositionBeforeAd.toFixed(
                                1
                            )}s (ad detected)`
                        );
                    }

                    // Seek to very end of ad (99% through)
                    const target = Math.max(
                        player.duration - 0.1,
                        player.duration * 0.99
                    );

                    // Mark this ad as processed
                    processedAds.add(adId);
                    isCurrentlyPlayingAd = true;
                    isSkippingAd = true;
                    lastAdStartTime = Date.now();

                    console.log(
                        `[YouTube Blocker] ⏩ Skipping ad #${
                            processedAds.size
                        } from ${player.currentTime.toFixed(
                            1
                        )}s to ${target.toFixed(
                            1
                        )}s (duration: ${player.duration.toFixed(1)}s)`
                    );

                    try {
                        // AGGRESSIVE: Multiple rapid seeks to ensure it works
                        player.currentTime = target;
                        lastBlockedAdURL = player.src;

                        // Wait a bit then seek again to make sure
                        await new Promise((resolve) => setTimeout(resolve, 50));
                        if (Math.abs(player.currentTime - target) > 1) {
                            player.currentTime = target;
                        }

                        // After skipping, wait a bit then check if we need to restore position
                        await new Promise((resolve) =>
                            setTimeout(resolve, 200)
                        );
                        isSkippingAd = false;

                        // If video jumped back to 0 (YouTube reset), restore to saved position
                        if (
                            videoPositionBeforeAd !== -1 &&
                            player.currentTime === 0 &&
                            videoPositionBeforeAd > 0
                        ) {
                            console.log(
                                `[YouTube Blocker] ⚠️ Video reset to 0! Restoring position to ${videoPositionBeforeAd.toFixed(
                                    1
                                )}s`
                            );
                            player.currentTime = videoPositionBeforeAd;
                            await new Promise((resolve) =>
                                setTimeout(resolve, 100)
                            );
                        }
                    } catch (e) {
                        console.log("[YouTube Blocker] Error seeking:", e);
                    }
                }
            }
        } catch (e) {
            console.log("[YouTube Blocker] Error in trySkipAd:", e);
        }
    }

    // Click skip button if visible - AGGRESSIVE approach
    async function tryClickSkipButton() {
        if (!blockEnabled) return;

        try {
            // Method 1: Direct skip button
            let skipBtn = document.querySelector("button.ytp-ad-skip-button");
            if (skipBtn && skipBtn.offsetHeight > 0) {
                try {
                    skipBtn.click();
                    console.log("[YouTube Blocker] ✓ Clicked skip button");
                    lastBlockedAdURL = "";
                    return true;
                } catch (e) {
                    // Try alternative click method
                    try {
                        skipBtn.dispatchEvent(
                            new MouseEvent("click", { bubbles: true })
                        );
                        console.log(
                            "[YouTube Blocker] ✓ Dispatched skip button click"
                        );
                        lastBlockedAdURL = "";
                        return true;
                    } catch (e2) {
                        // Continue to next method
                    }
                }
            }

            // Method 2: Look for "Skip" text on any button
            const allButtons = document.querySelectorAll(
                "button, div[role='button']"
            );
            for (const btn of allButtons) {
                const text = (btn.textContent || "").toLowerCase();
                const ariaLabel = (
                    btn.getAttribute("aria-label") || ""
                ).toLowerCase();

                if (
                    (text.includes("skip") && !text.includes("upload")) ||
                    (ariaLabel.includes("skip") &&
                        !ariaLabel.includes("upload"))
                ) {
                    if (btn.offsetHeight > 0 && btn.offsetWidth > 0) {
                        try {
                            btn.click();
                            console.log(
                                "[YouTube Blocker] ✓ Clicked skip button (text match)"
                            );
                            lastBlockedAdURL = "";
                            return true;
                        } catch (e) {
                            // Continue
                        }
                    }
                }
            }

            // Method 3: Look for "Ad will end in" countdown and wait for it to expire
            const countdownEl = document.querySelector(".ytp-ad-countdown");
            if (countdownEl) {
                const text = countdownEl.textContent || "";
                // If it says "Skip ad in X seconds", button will appear soon
                if (text.includes("Skip")) {
                    console.log(
                        "[YouTube Blocker] Countdown detected, skip button should appear"
                    );
                    return false; // Will retry
                }
            }
        } catch (e) {
            console.log("[YouTube Blocker] Error clicking skip button:", e);
        }
        return false;
    }

    // Block ad container elements - IMPROVED for mid-roll ads
    function hideAdElements() {
        if (!blockEnabled) return;

        try {
            // When ad is currently playing, check more frequently
            const now = Date.now();
            const checkDelay = isCurrentlyPlayingAd ? 10 : 50; // ULTRA-aggressive when ad detected

            if (now - lastAdDetectedTime < checkDelay) return; // Skip if checked recently

            lastAdDetectedTime = now;

            // Hide multiple ad overlays (comprehensive list)
            const selectors = [
                ".ytp-ad-player-overlay",
                ".ytp-ad-message-container",
                ".ytp-ad",
                ".ytp-ads-container",
                ".ytp-ad-skip-button-container", // Hide skip button container
                ".ytp-ad-countdown-container", // Hide countdown
                "div[data-ad]",
                ".html5-parent .ad", // Ads in main video area
                "div[role='alertdialog']", // Dialog boxes (not settings)
                ".ytp-ad-actions", // Ad action buttons
                ".adtx", // Ad text
                ".player-age-gate-content", // Age gate ads
                ".ytp-ad-button-container",
                ".ytp-ad-text",
                "[data-ad-container]",
            ];

            let adFound = false;
            for (const selector of selectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    for (const el of elements) {
                        if (!el) continue;

                        // IMPORTANT: Don't hide settings/user interface elements
                        const parent = el.closest(
                            ".ytp-settings-menu, .yt-uix-menu, .yt-menu-container, .yt-dropdown-menu"
                        );
                        if (parent) continue; // Skip settings menus

                        // Skip if it's clearly not an ad
                        const ariaLabel = el.getAttribute("aria-label") || "";
                        if (
                            ariaLabel.includes("Settings") ||
                            ariaLabel.includes("options")
                        )
                            continue;

                        if (el.offsetHeight > 0 || el.offsetWidth > 0) {
                            // Use multiple hiding techniques
                            el.style.display = "none !important";
                            el.style.visibility = "hidden !important";
                            el.style.pointerEvents = "none !important";
                            el.style.opacity = "0 !important";
                            el.style.width = "0 !important";
                            el.style.height = "0 !important";
                            el.style.position = "absolute !important";
                            el.style.left = "-9999px !important";
                            el.style.top = "-9999px !important";
                            adFound = true;

                            // Log what we're hiding
                            console.log(
                                `[YouTube Blocker] Hidden ad element: ${selector}`
                            );
                        }
                    }
                } catch (e) {
                    // Continue if selector fails
                }
            }

            if (adFound) {
                isCurrentlyPlayingAd = true;
                lastAdStartTime = now;
            }
        } catch (e) {
            // Ignore errors
        }
    }

    // Alternative ad detection and blocking via YouTube's player state
    function detectAdViaPlayerState() {
        if (!blockEnabled) return false;

        try {
            const player = document.querySelector("#movie_player");
            if (!player) return false;

            // Check if player has ad-related classes
            const classList = player.className || "";
            if (classList.includes("ad")) {
                console.log(
                    "[YouTube Blocker] 📺 Ad detected via player state"
                );
                return true;
            }
        } catch (e) {
            // Ignore
        }
        return false;
    }

    // Main ad checking routine - run more frequently
    async function checkAds() {
        if (!blockEnabled) return;

        adCheckCount++;

        // Hide ad elements FIRST (most important)
        hideAdElements();

        // Check player state
        detectAdViaPlayerState();

        // AGGRESSIVE: Try clicking skip button (multiple attempts)
        let clicked = await tryClickSkipButton();
        if (!clicked) {
            // If click failed, wait and try again
            await new Promise((resolve) => setTimeout(resolve, 100));
            clicked = await tryClickSkipButton();
        }

        // ALWAYS try seeking - don't wait for click to fail
        // This is the most reliable way to skip ads
        await trySkipAd();

        // If still no click, try one more time after a short delay
        if (!clicked) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            await tryClickSkipButton();
        }
    }

    // Intercept XMLHttpRequest to modify ad responses (JAdSkip's approach)
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
        const originalOnload = this.onload;
        if (originalOnload) {
            this.onload = function (...onloadArgs) {
                try {
                    if (
                        this.responseType === "" ||
                        this.responseType === "text"
                    ) {
                        const response = JSON.parse(this.response);

                        // Handle ad throttling
                        if ("adThrottled" in response) {
                            console.log(
                                `[YouTube Blocker] Ad throttling detected: ${response.adThrottled}`
                            );
                            if (blockEnabled) {
                                console.log(
                                    "[YouTube Blocker] Replacing ad throttling response"
                                );
                                Object.defineProperty(this, "response", {
                                    writable: true,
                                });
                                response.adThrottled = true;
                                this.response = JSON.stringify(response);
                            }
                        }

                        // Capture ad slots for later use
                        if (response.adSlots) {
                            console.log(
                                `[YouTube Blocker] Ad slots detected: ${response.adSlots.length}`
                            );
                            adSlots = response.adSlots;
                        }
                    }
                } catch (e) {
                    // Not JSON response
                }
                return originalOnload.apply(this, onloadArgs);
            };
        }
        return originalSend.apply(this, args);
    };

    // Listen for video playback to trigger ad checks
    document.addEventListener(
        "play",
        () => {
            isVideoPlaying = true;
            checkAds();
        },
        true
    );

    document.addEventListener(
        "pause",
        () => {
            isVideoPlaying = false;
        },
        true
    );

    // MID-ROLL AD DETECTION: Listen for when ads appear during playback
    // Create observer to detect when ad UI elements appear
    // FIXED: Don't interfere with settings or user UI elements
    const adObserver = new MutationObserver((mutations) => {
        if (!blockEnabled) return;

        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                // Check if any new nodes are ad-related
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        // Element node
                        const classList = node.className || "";
                        const id = node.id || "";

                        // CRITICAL: Skip settings/menu elements
                        if (
                            classList.includes("ytp-settings") ||
                            classList.includes("yt-menu") ||
                            classList.includes("yt-dropdown") ||
                            id.includes("settings") ||
                            id.includes("menu")
                        ) {
                            continue; // Skip settings elements
                        }

                        // Only process actual ad elements
                        if (
                            classList.includes("ytp-ad") ||
                            (classList.includes("ad") &&
                                !classList.includes("upload") &&
                                !classList.includes("readability")) ||
                            (id?.includes("ad") && !id.includes("upload"))
                        ) {
                            // Ad UI element appeared - trigger aggressive checking
                            isCurrentlyPlayingAd = true;
                            lastAdStartTime = Date.now();
                            console.log(
                                "[YouTube Blocker] 🎬 Mid-roll ad detected via DOM!"
                            );
                            checkAds();
                            break;
                        }
                    }
                }
            }
        }
    });

    // Start observing the document for ad elements
    try {
        adObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "style"],
        });
    } catch (e) {
        console.log("[YouTube Blocker] Could not set up ad observer:", e);
    }

    // Listen for seeking events - mid-roll ads often appear after seeking
    document.addEventListener(
        "seeking",
        () => {
            if (blockEnabled && isVideoPlaying) {
                console.log(
                    "[YouTube Blocker] Seeking detected - checking for ads"
                );
                isCurrentlyPlayingAd = true;
                lastAdStartTime = Date.now();
                checkAds();
            }
        },
        true
    );

    // Listen for playback rate changes - ads can affect playback rate
    document.addEventListener(
        "ratechange",
        () => {
            if (blockEnabled && isVideoPlaying) {
                console.log(
                    "[YouTube Blocker] Playback rate changed - checking for ads"
                );
                checkAds();
            }
        },
        true
    );

    // Smart interval checking - DYNAMICALLY AGGRESSIVE
    // When ad is detected, check every 300ms (aggressive)
    // When no ad, check every 800ms (efficient)
    // This catches ALL ads including mid-roll while keeping CPU low
    setInterval(() => {
        if (blockEnabled && isVideoPlaying && document.body) {
            const now = Date.now();

            // Detect if ad is currently playing
            const adCurrentlyPlaying = isAdPlaying();
            if (adCurrentlyPlaying) {
                isCurrentlyPlayingAd = true;
                lastAdStartTime = now;
            }

            // Determine check interval based on whether ad is playing
            let checkInterval = 800; // Default: efficient checking (800ms)

            if (isCurrentlyPlayingAd) {
                // Aggressive mode: check every 300ms while ad is playing
                checkInterval = 300;

                // Exit aggressive mode if 3 seconds have passed since ad detected
                if (now - lastAdStartTime > 3000) {
                    isCurrentlyPlayingAd = false;
                    // CRITICAL FIX: Reset stored position when ad ends
                    videoPositionBeforeAd = -1;
                    console.log(
                        "[YouTube Blocker] Ad ended, reset position tracking"
                    );
                }
            }

            // Check if enough time has passed
            if (now - lastCheckTime >= checkInterval) {
                lastCheckTime = now;
                checkAds().catch((e) =>
                    console.log("[YouTube Blocker] Interval check error:", e)
                );
            }
        }
    }, 100); // Poll every 100ms (lightweight), but only actually check every 800ms

    // Listen for YouTube navigation - RESET tracking
    document.addEventListener("yt-navigate-finish", () => {
        console.log(
            "[YouTube Blocker] Navigation detected, resetting ad tracking"
        );
        lastBlockedAdURL = "";
        adSlots = [];
        processedAds.clear(); // ← CLEAR processed ads on navigation
        videoPositionBeforeAd = -1; // RESET stored position
        checkAds();
    });

    // Listen for video end - RESET tracking for next video
    document.addEventListener(
        "ended",
        () => {
            console.log("[YouTube Blocker] Video ended, resetting ad tracking");
            processedAds.clear();
            lastBlockedAdURL = "";
            adSlots = [];
            videoPositionBeforeAd = -1; // RESET stored position
        },
        true
    );

    // Listen for seeking event - OPTIMIZED to debounce
    let lastSeekCheckTime = 0;
    document.addEventListener(
        "seeking",
        () => {
            if (!blockEnabled) return;

            const now = Date.now();
            // Only check if 200ms has passed since last seeking check
            if (now - lastSeekCheckTime >= 200) {
                lastSeekCheckTime = now;
                const player = getAdPlayer();
                if (player && player.duration < 90) {
                    console.log("[YouTube Blocker] Seeking detected during ad");
                    checkAds();
                }
            }
        },
        true
    );

    // Settings change handler
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "update-ads-blocker-settings") {
            blockEnabled = isYouTube
                ? request.blockYoutubeAds
                : isYouTubeMusic
                ? request.blockYoutubeMusicAds
                : false;
            lastBlockedAdURL = "";
            adSlots = [];
            processedAds.clear(); // ← CLEAR on settings change
            console.log("[YouTube Blocker] ⚙️ Settings updated:", {
                blockEnabled,
                blockYoutubeAds: request.blockYoutubeAds,
                blockYoutubeMusicAds: request.blockYoutubeMusicAds,
            });
            checkAds();
        }
    });

    console.log("[YouTube Blocker] Ready - Using proven JAdSkip approach");
})();
