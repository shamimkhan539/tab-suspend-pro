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
    let isYouTubeShorts = false; // Detect if we're on YouTube Shorts
    let shortsDetectionAttempts = 0; // Track attempts to detect shorts
    let lastSeekerTime = 0; // Track last seeked time to prevent rapid seeking
    let pauseResumeTimeout = null; // Timeout for pause/resume detection

    // Function to detect if we're on YouTube Shorts
    function detectYouTubeShorts() {
        try {
            // Check multiple ways YouTube Shorts is detected
            const url = window.location.href;
            const isOnShorts =
                url.includes("/shorts/") ||
                document.querySelector('[data-is-short="true"]') ||
                document.querySelector(".reel-player-container");

            if (isOnShorts) {
                isYouTubeShorts = true;
                console.log(
                    "[YouTube Blocker] 🎬 YouTube Shorts detected - applying shorts-specific optimization"
                );
            }
            return isOnShorts;
        } catch (e) {
            return false;
        }
    }

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

    // Detect YouTube Shorts immediately and monitor for changes
    detectYouTubeShorts();

    // Also detect on navigation
    document.addEventListener("yt-navigate-finish", () => {
        detectYouTubeShorts();
    });

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
            if (player.duration < 90) {
                // Video ads are usually < 90 seconds (covering most pre-roll, mid-roll ads)
                if (!shouldSkip) {
                    const target = Math.max(
                        player.duration - 0.5,
                        player.duration * 0.95
                    );

                    // Mark this ad as processed
                    processedAds.add(adId);
                    isCurrentlyPlayingAd = true;
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
                        player.currentTime = target;
                        lastBlockedAdURL = player.src;
                    } catch (e) {
                        console.log("[YouTube Blocker] Error seeking:", e);
                    }
                }
            }
        } catch (e) {
            console.log("[YouTube Blocker] Error in trySkipAd:", e);
        }
    }

    // Click skip button if visible
    async function tryClickSkipButton() {
        if (!blockEnabled) return;

        try {
            // Direct approach: look for skip button
            const skipBtn = document.querySelector("button.ytp-ad-skip-button");
            if (skipBtn && skipBtn.offsetHeight > 0) {
                try {
                    skipBtn.click();
                    console.log("[YouTube Blocker] ✓ Clicked skip button");
                    lastBlockedAdURL = "";
                    return true;
                } catch (e) {
                    // Try alternative click method
                    skipBtn.dispatchEvent(
                        new MouseEvent("click", { bubbles: true })
                    );
                    console.log(
                        "[YouTube Blocker] ✓ Dispatched skip button click"
                    );
                    lastBlockedAdURL = "";
                    return true;
                }
            }

            // Alternative: look for "Skip Ads" or similar text button
            const buttons = document.querySelectorAll("button");
            for (const btn of buttons) {
                if (
                    btn.textContent.includes("Skip") ||
                    btn.textContent.includes("skip")
                ) {
                    if (btn.offsetHeight > 0) {
                        try {
                            btn.click();
                            console.log(
                                "[YouTube Blocker] ✓ Clicked alternative skip button"
                            );
                            lastBlockedAdURL = "";
                            return true;
                        } catch (e) {
                            // Continue
                        }
                    }
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
            const checkDelay = isCurrentlyPlayingAd ? 50 : 100; // More aggressive when ad detected

            if (now - lastAdDetectedTime < checkDelay) return; // Skip if checked recently

            lastAdDetectedTime = now;

            // Hide multiple ad overlays
            const selectors = [
                ".ytp-ad-player-overlay",
                ".ytp-ad-message-container",
                ".ytp-ad",
                ".ytp-ads-container",
                "div[data-ad]",
            ];

            let adFound = false;
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    if (el && el.offsetHeight > 0) {
                        el.style.display = "none !important";
                        el.style.visibility = "hidden !important";
                        el.style.pointerEvents = "none !important";
                        el.style.opacity = "0 !important";
                        adFound = true;
                    }
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

        // Aggressive multi-step ad blocking
        hideAdElements();

        // Check player state first
        detectAdViaPlayerState();

        // Try clicking skip button (multiple attempts)
        const clicked1 = await tryClickSkipButton();
        if (!clicked1) {
            // If click failed, wait less and try seeking immediately
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Always try seeking - don't wait for click to fail
        await trySkipAd();

        // Second attempt for skip button (for non-skippable ads becoming skippable)
        if (!clicked1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
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
            // Skip if on YouTube Shorts to avoid rapid pause/resume
            if (isYouTubeShorts) {
                console.log(
                    "[YouTube Blocker] Shorts play event - skipping to prevent pause/resume loop"
                );
                return;
            }
            isVideoPlaying = true;
            checkAds();
        },
        true
    );

    document.addEventListener(
        "pause",
        () => {
            // Skip if on YouTube Shorts to avoid rapid pause/resume
            if (isYouTubeShorts) {
                console.log(
                    "[YouTube Blocker] Shorts pause event - skipping to prevent pause/resume loop"
                );
                return;
            }
            isVideoPlaying = false;
        },
        true
    );

    // MID-ROLL AD DETECTION: Listen for when ads appear during playback
    // Create observer to detect when ad UI elements appear
    // FIXED: Disabled for YouTube Shorts to prevent false positives
    const adObserver = new MutationObserver((mutations) => {
        if (!blockEnabled) return;

        // CRITICAL: Skip mutation observer on Shorts - reduces false ad detection
        if (isYouTubeShorts) {
            return;
        }

        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                // Check if any new nodes are ad-related
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        // Element node
                        const classList = node.className || "";
                        if (
                            classList.includes("ytp-ad") ||
                            classList.includes("ad") ||
                            node.id?.includes("ad")
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
    // BUT: Skip on Shorts to avoid pause/resume loops
    document.addEventListener(
        "seeking",
        () => {
            if (!blockEnabled || !isVideoPlaying) return;

            // CRITICAL FIX: Don't trigger seeking checks on YouTube Shorts
            // Shorts uses rapid seeking for transitions, causing false pause/resume
            if (isYouTubeShorts) {
                console.log(
                    "[YouTube Blocker] Shorts seeking event - skipping to prevent pause/resume loop"
                );
                return;
            }

            console.log(
                "[YouTube Blocker] Seeking detected - checking for ads"
            );
            isCurrentlyPlayingAd = true;
            lastAdStartTime = Date.now();
            checkAds();
        },
        true
    );

    // Listen for playback rate changes - ads can affect playback rate
    document.addEventListener(
        "ratechange",
        () => {
            // Skip on Shorts
            if (isYouTubeShorts) return;

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
    // FIXED: Disable for YouTube Shorts to prevent pause/resume issues
    setInterval(() => {
        if (blockEnabled && isVideoPlaying && document.body) {
            // CRITICAL: Skip interval checking on YouTube Shorts
            if (isYouTubeShorts) {
                return;
            }

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
        },
        true
    );

    // Listen for seeking event - OPTIMIZED to debounce
    // FIXED: Skip on YouTube Shorts to prevent pause/resume loops
    let lastSeekCheckTime = 0;
    document.addEventListener(
        "seeking",
        () => {
            if (!blockEnabled) return;

            // CRITICAL: Skip seeking checks on Shorts - prevents pause/resume issues
            if (isYouTubeShorts) {
                return;
            }

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
