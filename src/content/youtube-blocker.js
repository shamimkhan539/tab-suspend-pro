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

    // Load settings immediately
    loadSettings().then((success) => {
        if (!success) {
            // Retry after a short delay if first attempt fails
            setTimeout(loadSettings, 500);
        }
    });

    // Get ad player element (the video playing ads)
    function getAdPlayer() {
        try {
            const player = document.querySelector(".html5-main-video");
            return player && player.tagName === "VIDEO" ? player : null;
        } catch (e) {
            return null;
        }
    }

    // Skip ad by seeking to end (JAdSkip's approach)
    async function trySkipAd() {
        if (!blockEnabled) return;

        const player = getAdPlayer();
        if (!player) return;

        console.log(
            `[YouTube Blocker] Processing ad "${player.src}" at ${player.currentTime} / ${player.duration}`
        );

        if (!isFinite(player.duration)) {
            console.log(
                "[YouTube Blocker] Ad duration is not finite, skipping ad skip"
            );
            return;
        }

        // Avoid processing same ad twice
        if (player.src === lastBlockedAdURL) {
            console.log("[YouTube Blocker] Skipping already processed ad");
            return;
        }

        // Skip if 40% through (threshold)
        const threshold = player.duration * 0.4;
        if (player.currentTime < threshold) {
            console.log(
                `[YouTube Blocker] Ad not ready to skip. Current: ${player.currentTime}, Threshold: ${threshold}`
            );
            return;
        }

        // Seek to near end of ad
        const target = player.duration - 0.1;
        console.log(
            `[YouTube Blocker] Skipping ad from ${player.currentTime} to ${target}`
        );

        try {
            player.currentTime = target;
            lastBlockedAdURL = player.src;
        } catch (e) {
            console.log("[YouTube Blocker] Error seeking:", e);
        }
    }

    // Click skip button if visible
    async function tryClickSkipButton() {
        if (!blockEnabled) return;

        try {
            const player = document.getElementById("movie_player");
            if (!player) {
                console.log("[YouTube Blocker] Unable to find movie player");
                return;
            }

            // Try captured ad slots
            if (adSlots.length > 0) {
                console.log(
                    `[YouTube Blocker] Checking captured ad slots: ${adSlots.length}`
                );
                adSlots.forEach((slot) => {
                    try {
                        if (slot?.clickTrackingParams) {
                            console.log(
                                "[YouTube Blocker] Found clickable ad slot"
                            );
                            // Trigger skip if available
                            const skipBtn = document.querySelector(
                                "button.ytp-ad-skip-button"
                            );
                            if (skipBtn && skipBtn.offsetHeight > 0) {
                                skipBtn.click();
                                console.log(
                                    "[YouTube Blocker] Clicked skip button"
                                );
                            }
                        }
                    } catch (e) {
                        // Continue
                    }
                });
            }

            // Direct skip button click
            const skipBtn = document.querySelector("button.ytp-ad-skip-button");
            if (skipBtn && skipBtn.offsetHeight > 0) {
                skipBtn.click();
                console.log("[YouTube Blocker] Clicked visible skip button");
            }
        } catch (e) {
            console.log("[YouTube Blocker] Error clicking skip button:", e);
        }
    }

    // Main ad checking routine
    async function checkAds() {
        if (!blockEnabled) return;
        await tryClickSkipButton();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await trySkipAd();
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

    // Also check periodically
    setInterval(checkAds, 1500);

    // Listen for YouTube navigation
    document.addEventListener("yt-navigate-finish", () => {
        lastBlockedAdURL = "";
        adSlots = [];
        checkAds();
    });

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
            console.log("[YouTube Blocker] Settings updated:", {
                blockEnabled,
                blockYoutubeAds: request.blockYoutubeAds,
                blockYoutubeMusicAds: request.blockYoutubeMusicAds,
            });
            checkAds();
        }
    });

    console.log("[YouTube Blocker] Ready - Using proven JAdSkip approach");
})();
