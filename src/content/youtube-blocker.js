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

        try {
            let player = null;

            // YouTube Music has different player structure
            if (isYouTubeMusic) {
                const playerElement = document.getElementById("player");
                if (!playerElement) {
                    logMessage("Unable to find YouTube Music player");
                    return;
                }
                player = playerElement.getPlayer
                    ? playerElement.getPlayer()
                    : null;
                if (!player) {
                    logMessage("Unable to get YouTube Music player instance");
                    return;
                }
            } else {
                // Regular YouTube
                const moviePlayer = document.getElementById("movie_player");
                if (!moviePlayer) {
                    logMessage("Unable to find movie player");
                    return;
                }

                player = moviePlayer;
                if (player.getPlayerPromise) {
                    player = await player.getPlayerPromise();
                }
            }

            // Check if player supports ad clicks
            if (!player.onAdUxClicked) {
                logMessage("Player does not support ad UX clicks");
                return;
            }

            // Get ad slots from player response
            const playerSlots = player.getPlayerResponse()?.adSlots;
            if (!playerSlots) {
                logMessage("No ad slots found in player response");
                return;
            }

            logMessage(
                `Trying ad slots from player response: ${playerSlots.length}`
            );

            // YouTube Music uses different trigger structure
            if (isYouTubeMusic) {
                playerSlots.forEach((slot) => {
                    const triggers =
                        slot.adSlotRenderer?.fulfillmentContent?.fulfilledLayout
                            ?.playerBytesAdLayoutRenderer
                            ?.layoutExitSkipTriggers;
                    if (!triggers) return;

                    triggers.forEach((trigger) => {
                        const triggeringLayoutId =
                            trigger.skipRequestedTrigger?.triggeringLayoutId;
                        if (triggeringLayoutId) {
                            player.onAdUxClicked(
                                "skip-button",
                                triggeringLayoutId
                            );
                            logMessage(
                                `Clicked YouTube Music skip trigger: ${triggeringLayoutId}`
                            );
                        }
                    });
                });
            } else {
                // Regular YouTube
                // Try captured ad slots first
                if (adSlots.length > 0) {
                    logMessage(`Trying captured ad slots: ${adSlots.length}`);
                    adSlots.forEach((slot) => {
                        clickTriggers(player, slot);
                    });
                }

                // Try ad slots from player response
                playerSlots.forEach((slot) => {
                    clickTriggers(player, slot);
                });
            }
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

        // For YouTube Music: Skip immediately (no threshold)
        // For regular YouTube: Wait until 40% through ad (prevents detection)
        if (!isYouTubeMusic) {
            const threshold = player.duration * 0.4;
            if (player.currentTime < threshold) {
                logMessage(
                    `Ad is not ready to be skipped, current time: ${player.currentTime}, threshold: ${threshold}`
                );
                return;
            }
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

        // YouTube Music has different idle popup structure
        if (isYouTubeMusic) {
            const renderers = document.getElementsByTagName(
                "ytmusic-you-there-renderer"
            );

            if (renderers.length === 0) return;

            const renderer = renderers[0];
            if (renderer.checkVisibility && !renderer.checkVisibility()) return;

            const button = renderer.querySelector("button");
            if (!button) return;

            logMessage(
                `Clicking YouTube Music YouThere button: ${button.textContent}`
            );
            button.click();
            return;
        }

        // Regular YouTube idle popup - Multiple detection methods
        // CRITICAL: Only detect "Still watching?" popup, NOT settings or other popups

        // Method 1: Look for yt-confirm-dialog-renderer (newer structure)
        const confirmDialog = document.querySelector(
            "yt-confirm-dialog-renderer"
        );
        if (confirmDialog) {
            // Check if this is actually a "Still watching?" dialog
            const dialogText = (confirmDialog.textContent || "").toLowerCase();

            // Skip if this is NOT a continue watching dialog
            if (
                !dialogText.includes("video paused") &&
                !dialogText.includes("continue watching") &&
                !dialogText.includes("still watching") &&
                !dialogText.includes("still there")
            ) {
                return; // Not the idle popup, skip it
            }

            const dialogButtons = confirmDialog.querySelectorAll(
                "button, yt-button-renderer button, #confirm-button"
            );

            for (const btn of dialogButtons) {
                const text = (btn.textContent || "").toLowerCase();
                const ariaLabel = (
                    btn.getAttribute("aria-label") || ""
                ).toLowerCase();

                // Look for "yes", "continue", "confirm" text
                if (
                    text.includes("yes") ||
                    text.includes("continue") ||
                    ariaLabel.includes("yes") ||
                    ariaLabel.includes("continue")
                ) {
                    logMessage(
                        `Clicking confirm dialog button: "${btn.textContent}"`
                    );
                    btn.click();
                    return;
                }
            }
        }

        // Method 2: Look for paper-dialog with "Still watching?" text
        const paperDialogs = document.querySelectorAll(
            "paper-dialog, ytd-popup-container"
        );
        for (const dialog of paperDialogs) {
            if (dialog.offsetWidth === 0 || dialog.offsetHeight === 0) continue;

            // Check dialog content to ensure it's the idle popup
            const dialogText = (dialog.textContent || "").toLowerCase();

            // Skip if this is NOT a continue watching dialog
            if (
                !dialogText.includes("video paused") &&
                !dialogText.includes("continue watching") &&
                !dialogText.includes("still watching") &&
                !dialogText.includes("still there")
            ) {
                continue; // Not the idle popup, skip to next dialog
            }

            const buttons = dialog.querySelectorAll(
                "button, yt-button-renderer button, #button"
            );
            for (const btn of buttons) {
                const text = (btn.textContent || "").toLowerCase();
                const ariaLabel = (
                    btn.getAttribute("aria-label") || ""
                ).toLowerCase();

                if (
                    text.includes("yes") ||
                    text.includes("continue") ||
                    ariaLabel.includes("yes") ||
                    ariaLabel.includes("continue")
                ) {
                    logMessage(
                        `Clicking idle popup button: "${btn.textContent}"`
                    );
                    btn.click();
                    return;
                }
            }
        }

        // Method 3: Legacy method - Look for #confirm-button with proper validation
        const confirmButtons = document.querySelectorAll("#confirm-button");

        for (const button of confirmButtons) {
            // Skip if button is not visible
            if (!button.checkVisibility || !button.checkVisibility()) {
                if (button.offsetWidth === 0 || button.offsetHeight === 0) {
                    continue;
                }
            }

            // Check parent dialog text to ensure it's the idle popup
            const parentDialog = button.closest(
                "yt-confirm-dialog-renderer, paper-dialog, ytd-popup-container"
            );
            if (parentDialog) {
                const dialogText = (
                    parentDialog.textContent || ""
                ).toLowerCase();

                // Only click if it's actually the idle popup
                if (
                    dialogText.includes("video paused") ||
                    dialogText.includes("continue watching") ||
                    dialogText.includes("still watching") ||
                    dialogText.includes("still there")
                ) {
                    logMessage(`Clicking idle confirm button`);
                    button.click();
                    return;
                }
            }

            // Fallback: Check button's data attributes (legacy method)
            if (button.data) {
                const actions =
                    button.data?.serviceEndpoint?.signalServiceEndpoint
                        ?.actions;
                if (actions) {
                    let found = false;
                    actions.forEach((action) => {
                        const signal = action.signalAction?.signal;
                        if (signal === "ACKNOWLEDGE_YOUTHERE") {
                            logMessage(
                                "Clicking confirm button via legacy method"
                            );
                            button.click();
                            found = true;
                        }
                    });

                    if (found) return;
                }
            }
        }
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

    // Periodic idle checking (every 1 second - faster to catch popups)
    setInterval(() => {
        if (blockEnabled) {
            checkIdle();
        }
    }, 1000);

    // Watch for popup dialogs appearing in DOM (instant detection)
    const popupObserver = new MutationObserver((mutations) => {
        if (!blockEnabled) return;

        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue; // Element nodes only

                const element = node;
                const classList = element.className || "";
                const tagName = element.tagName?.toLowerCase() || "";

                // Detect popup containers
                if (
                    classList.includes("yt-confirm-dialog") ||
                    classList.includes("ytd-popup-container") ||
                    tagName === "yt-confirm-dialog-renderer" ||
                    tagName === "paper-dialog" ||
                    element.id === "confirm-dialog"
                ) {
                    // CRITICAL: Only check idle if this looks like an idle popup
                    // Check the text content to avoid interfering with settings/other popups
                    const elementText = (
                        element.textContent || ""
                    ).toLowerCase();

                    if (
                        elementText.includes("video paused") ||
                        elementText.includes("continue watching") ||
                        elementText.includes("still watching") ||
                        elementText.includes("still there")
                    ) {
                        logMessage(
                            "Idle popup detected via observer, checking idle"
                        );
                        setTimeout(checkIdle, 100); // Small delay for rendering
                    }
                    break;
                }
            }
        }
    });

    // Observe body for popup additions
    try {
        popupObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
        logMessage("Popup observer started");
    } catch (e) {
        logMessage(`Could not start popup observer: ${e.message}`);
    }

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
