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
    let processedAds = new Set(); // Track processed ads by ID/combination
    let adCheckCount = 0; // Counter for aggressive checking

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

            // Create unique ad identifier based on duration and current time
            // This helps track different ads without relying on URL
            const adId = `${Math.round(player.duration)}_${Math.round(
                player.currentTime * 10
            )}`;

            // If already processed this specific ad configuration, skip
            if (processedAds.has(adId)) {
                return;
            }

            // For video ads: seek aggressively to skip
            if (player.duration < 90) {
                // Video ads are usually < 90 seconds (covering most pre-roll, mid-roll ads)
                const target = Math.max(
                    player.duration - 0.5,
                    player.duration * 0.95
                );

                // Mark this ad as processed
                processedAds.add(adId);

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

    // Block ad container elements
    function hideAdElements() {
        if (!blockEnabled) return;
        try {
            // Hide ad panels and overlays
            const adElements = document.querySelectorAll([
                ".ytp-ad-player-overlay",
                ".ytp-ad-message-container",
                "div[aria-label*='Advertisement']",
                "div[aria-label*='advertisement']",
                ".ytp-ad",
                ".ytp-ads",
            ]);
            adElements.forEach((el) => {
                if (el) {
                    el.style.display = "none";
                    el.style.visibility = "hidden";
                    el.style.pointerEvents = "none";
                    el.style.opacity = "0";
                }
            });
        } catch (e) {
            // Ignore
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
    document.addEventListener("play", checkAds, true);

    // Check very frequently when video is playing
    setInterval(() => {
        if (blockEnabled && document.body) {
            checkAds().catch((e) =>
                console.log("[YouTube Blocker] Interval check error:", e)
            );
        }
    }, 300); // Check every 300ms for maximum ad coverage

    // More aggressive checking for first 3 seconds (when most pre-roll ads play)
    let initialCheckCount = 0;
    const initialCheckInterval = setInterval(() => {
        if (blockEnabled && document.body && initialCheckCount < 10) {
            initialCheckCount++;
            checkAds().catch((e) => {
                console.log("[YouTube Blocker] Initial check error:", e);
            });
        } else {
            clearInterval(initialCheckInterval);
        }
    }, 150); // Check every 150ms for first 1.5 seconds

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

    // Listen for seeking event - might indicate ad skipping attempt
    document.addEventListener(
        "seeking",
        () => {
            const player = getAdPlayer();
            if (player && player.duration < 90) {
                console.log("[YouTube Blocker] Seeking detected during ad");
                checkAds();
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
