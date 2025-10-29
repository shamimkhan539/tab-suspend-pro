// YouTube Ad Blocker - REWRITTEN based on JAdSkip's proven approach
// Original JAdSkip: https://github.com/JC-comp/JAdSkip
// This implementation fixes all ad blocking issues by using YouTube's Player API

(function () {
    "use strict";

    const hostname = window.location.hostname;
    const isYouTube =
        hostname.includes("youtube.com") || hostname.includes("youtu.be");
    const isYouTubeMusic = hostname.includes("music.youtube.com");

    if (!isYouTube && !isYouTubeMusic) {
        return;
    }

    console.log(
        "[YouTube Blocker] JAdSkip implementation initialized on",
        hostname
    );

    // State variables
    let blockEnabled = false;
    let adSlots = [];
    let lastBlockedAdURL = "";
    let lastBlockedTime = 0;

    // Logging function
    function logMessage(msg) {
        console.log(`[YouTube Blocker] ${msg}`);
    }

    // Get ad player
    function getAdPlayer() {
        const videos = document.querySelectorAll("video");
        for (const video of videos) {
            if (
                video.src &&
                video.src.includes("googlevideo.com/videoplayback")
            ) {
                // Check if it's an ad by duration (ads are typically < 120 seconds)
                if (video.duration > 0 && video.duration < 120) {
                    return video;
                }
            }
        }
        return null;
    }

    // Click triggers using YouTube's Player API (JAdSkip's approach)
    function clickTriggers(player, slot) {
        if (!player.onAdUxClicked) {
            logMessage("Player does not support onAdUxClicked API");
            return;
        }

        try {
            // Use YouTube's internal API to skip ads
            player.onAdUxClicked(slot);
            logMessage(`Clicked ad slot trigger via Player API`);
        } catch (e) {
            logMessage(`Error clicking ad trigger: ${e.message}`);
        }
    }

    // Try to click skip button using YouTube's Player API (JAdSkip's proven method)
    async function tryClickSkipButton() {
        if (!blockEnabled) return;
        if (!getAdPlayer()) return;

        const moviePlayer = document.getElementById("movie_player");
        if (!moviePlayer) {
            logMessage("Unable to find movie player");
            return;
        }

        try {
            // Get player promise if available
            let player = moviePlayer;
            if (player.getPlayerPromise) {
                player = await player.getPlayerPromise();
            }

            // Check if player supports ad clicks
            if (!player.onAdUxClicked) {
                logMessage("Player does not support ad UX clicks");
                return;
            }

            // Try captured ad slots first
            if (adSlots.length === 0) {
                logMessage("No ad slots captured yet");
            } else {
                logMessage(`Trying captured ad slots: ${adSlots.length}`);
                adSlots.forEach((slot) => {
                    clickTriggers(player, slot);
                });
            }

            // Try ad slots from player response
            const playerSlots = player.getPlayerResponse()?.adSlots;
            if (!playerSlots) {
                logMessage("No ad slots found in player response");
                return;
            }

            logMessage(
                `Trying ad slots from player response: ${playerSlots.length}`
            );
            playerSlots.forEach((slot) => {
                clickTriggers(player, slot);
            });
        } catch (e) {
            logMessage(`Error in tryClickSkipButton: ${e.message}`);
        }
    }

    // Skip ad by seeking (JAdSkip's approach)
    async function trySkipAd() {
        if (!blockEnabled) return;

        const player = getAdPlayer();
        if (!player) return;

        logMessage(
            `Processing ad "${player.src}" at ${player.currentTime} / ${player.duration}`
        );

        // Check if duration is valid
        if (!isFinite(player.duration)) {
            logMessage("Ad duration is not finite, skipping ad skip");
            return;
        }

        // Skip if already processed this ad URL
        if (player.src === lastBlockedAdURL) {
            logMessage("Skipping already processed ad");
            return;
        }

        // CRITICAL: Wait until 40% through ad before seeking (JAdSkip's approach)
        const threshold = player.duration * 0.4;
        if (player.currentTime < threshold) {
            logMessage(
                `Ad is not ready to be skipped, current time: ${player.currentTime}, threshold: ${threshold}`
            );
            return;
        }

        // Seek to near end of ad (simple and effective)
        const target = player.duration - 0.1;
        logMessage(`Skipping ad from ${player.currentTime} to ${target}`);

        player.currentTime = target;
        lastBlockedAdURL = player.src;
        lastBlockedTime = Date.now();
    }

    // Main ad checking routine (JAdSkip's order of operations)
    async function checkAds() {
        if (!blockEnabled) return;

        // 1. Try clicking skip button first (using Player API)
        await tryClickSkipButton();

        // 2. Wait 1 second (important for skip button to register)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 3. Try seeking to skip ad
        await trySkipAd();
    }

    // Check for "Still watching?" idle popup (CRITICAL - this was missing!)
    async function checkIdle() {
        if (!blockEnabled) return;

        let button = null;
        const buttons = document.querySelectorAll("#confirm-button");
        logMessage(`Found ${buttons.length} confirm buttons`);

        // Find visible confirm button
        for (let i = 0; i < buttons.length; i++) {
            if (buttons[i].checkVisibility && buttons[i].checkVisibility()) {
                button = buttons[i];
                break;
            }
        }

        if (!button) return;

        // Check if it's a "Still watching?" popup
        const actions =
            button.data?.serviceEndpoint?.signalServiceEndpoint?.actions;
        logMessage(`Actions found: ${actions ? actions.length : 0}`);

        if (!actions) return;

        actions.forEach((action) => {
            const signal = action.signalAction?.signal;
            if (!signal) return;

            if (signal === "ACKNOWLEDGE_YOUTHERE") {
                logMessage(
                    "Clicking confirm button for 'Still watching?' popup"
                );
                button.click();
            }
        });
    }

    // Intercept XMLHttpRequest to capture ad slots and modify responses (JAdSkip's approach)
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
        const originalOnload = this.onload;

        if (originalOnload) {
            this.onload = function (...onloadArgs) {
                try {
                    const response = JSON.parse(this.response);

                    // Handle ad throttling
                    if ("adThrottled" in response) {
                        logMessage(
                            `Ad throttling response detected: ${response.adThrottled}`
                        );
                        if (blockEnabled) {
                            logMessage("Replacing ad throttling response");
                            Object.defineProperty(this, "response", {
                                writable: true,
                            });
                            response.adThrottled = true;
                            this.response = JSON.stringify(response);
                        } else if (response.adSlots) {
                            logMessage(
                                `Ad slots detected: ${response.adSlots.length}`
                            );
                            adSlots = response.adSlots;
                        }
                    }
                } catch (e) {
                    // Not a JSON response, continue as normal
                }

                return originalOnload.apply(this, onloadArgs);
            };
        }

        return originalSend.apply(this, args);
    };

    // Load settings from background
    async function loadSettings() {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage(
                    { action: "get-youtube-blocker-settings" },
                    function (response) {
                        if (chrome.runtime.lastError) {
                            logMessage(
                                `Error getting settings: ${chrome.runtime.lastError.message}`
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
                            logMessage(
                                `Settings loaded: blockEnabled=${blockEnabled}`
                            );
                            resolve(true);
                        } else {
                            logMessage("No response from background");
                            resolve(false);
                        }
                    }
                );
            } catch (error) {
                logMessage(`Error sending message: ${error.message}`);
                resolve(false);
            }
        });
    }

    // Setup video event listeners (JAdSkip's approach)
    function setupVideoListeners() {
        const videos = document.querySelectorAll("video");
        logMessage(`Setting up listeners for ${videos.length} videos`);

        videos.forEach((video) => {
            // Skip if already has listeners
            if (video.hasAttribute("jadskip-listener")) return;
            video.setAttribute("jadskip-listener", "1");

            // On video play - check for ads
            video.addEventListener("play", () => {
                logMessage("Video play detected, checking for ads");
                checkAds();
            });

            // On video pause - check for idle popup
            video.addEventListener("pause", () => {
                logMessage("Video pause detected, checking for idle popup");
                checkIdle();
            });

            // Watch for source changes
            const observer = new MutationObserver(() => {
                logMessage("Video source changed, checking for ads");
                checkAds();
            });

            observer.observe(video, {
                attributes: true,
                attributeFilter: ["src"],
            });
        });

        // Re-run every 2 seconds to catch new videos
        setTimeout(setupVideoListeners, 2000);
    }

    // Listen for YouTube navigation
    function onNavigate() {
        logMessage("Navigation detected, resetting state");
        lastBlockedAdURL = "";
        lastBlockedTime = 0;
        adSlots = [];
        setupVideoListeners();
    }

    // Setup navigation listeners
    if (window.navigation && window.navigation.addEventListener) {
        window.navigation.addEventListener("navigate", onNavigate);
    } else {
        window.addEventListener("yt-navigate-finish", onNavigate);
    }

    // Periodic ad checking (every 2 seconds when video is playing)
    setInterval(() => {
        if (blockEnabled && getAdPlayer()) {
            logMessage("Periodic check: Ad detected");
            checkAds();
        }
    }, 2000);

    // Periodic idle checking (every 3 seconds)
    setInterval(() => {
        if (blockEnabled) {
            checkIdle();
        }
    }, 3000);

    // Initialize
    (async function init() {
        logMessage("Initializing YouTube Ad Blocker (JAdSkip implementation)");

        // Load settings
        const success = await loadSettings();
        if (!success) {
            logMessage("Failed to load settings, retrying in 1 second...");
            setTimeout(init, 1000);
            return;
        }

        // Setup video listeners
        setupVideoListeners();

        // Initial checks
        checkAds();

        logMessage("Initialization complete");
    })();
})();
