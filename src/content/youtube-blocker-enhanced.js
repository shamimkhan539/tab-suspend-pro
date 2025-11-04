// YouTube Ad Blocker - ENHANCED VERSION with Shorts & Music support
// Based on JAdSkip's proven approach with critical enhancements for:
// 1. YouTube Music next button ads
// 2. Auto-pause prevention ("Still watching?")
// 3. YouTube Shorts ads and pause fixes
// Original JAdSkip: https://github.com/JC-comp/JAdSkip

(function () {
    "use strict";

    const hostname = window.location.hostname;
    const isYouTube =
        hostname.includes("youtube.com") || hostname.includes("youtu.be");
    const isYouTubeMusic = hostname.includes("music.youtube.com");
    const isYouTubeShorts =
        isYouTube &&
        (window.location.pathname.includes("/shorts/") ||
            document.body.classList.contains("ytd-shorts"));

    if (!isYouTube && !isYouTubeMusic) {
        return;
    }

    console.log(
        "[YouTube Blocker] Enhanced implementation initialized on",
        hostname,
        { isShorts: isYouTubeShorts, isMusic: isYouTubeMusic }
    );

    // State variables
    let blockEnabled = false;
    let adSlots = [];
    let lastBlockedAdURL = "";
    let lastBlockedTime = 0;
    let autoResumeActive = false;

    // Logging function
    function logMessage(msg) {
        console.log(`[YouTube Blocker] ${msg}`);
    }

    // Get ad player
    function getAdPlayer() {
        const videos = document.querySelectorAll("video");
        for (const video of videos) {
            const src = video.src || "";
            const isShortsVideo = video.closest(
                "ytd-reel-video-renderer, [data-is-shorts-video], .shorts-player"
            );

            // For Shorts: detect ads by looking at video container
            if (isYouTubeShorts && isShortsVideo) {
                // Shorts ads are typically short duration
                if (
                    src.includes("googlevideo.com") &&
                    video.duration > 0 &&
                    video.duration < 120
                ) {
                    return video;
                }
            }
            // Regular YouTube/Music: check for ad URL and duration
            else if (
                src.includes("googlevideo.com/videoplayback") &&
                video.duration > 0 &&
                video.duration < 120
            ) {
                return video;
            }
        }
        return null;
    }

    // Click triggers using YouTube's Player API (JAdSkip's approach)
    function clickTriggers(player, slot) {
        if (!player.onAdUxClicked) {
            return;
        }

        try {
            player.onAdUxClicked(slot);
            logMessage(`Clicked ad slot trigger via Player API`);
        } catch (e) {
            logMessage(`Error clicking ad trigger: ${e.message}`);
        }
    }

    // Try to click skip button
    async function tryClickSkipButton() {
        if (!blockEnabled) return;
        if (!getAdPlayer()) return;

        try {
            let player = null;

            if (isYouTubeMusic) {
                const playerElement = document.getElementById("player");
                if (!playerElement) return;

                player = playerElement.getPlayer
                    ? playerElement.getPlayer()
                    : null;
                if (!player) return;
            } else {
                const moviePlayer = document.getElementById("movie_player");
                if (!moviePlayer) return;

                player = moviePlayer;
                if (player.getPlayerPromise) {
                    player = await player.getPlayerPromise();
                }
            }

            if (!player.onAdUxClicked) return;

            const playerResponse = player.getPlayerResponse?.();
            const playerSlots = playerResponse?.adSlots;
            if (!playerSlots) return;

            logMessage(
                `Trying ad slots from player response: ${playerSlots.length}`
            );

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
                if (adSlots.length > 0) {
                    logMessage(`Trying captured ad slots: ${adSlots.length}`);
                    adSlots.forEach((slot) => {
                        clickTriggers(player, slot);
                    });
                }

                playerSlots.forEach((slot) => {
                    clickTriggers(player, slot);
                });
            }
        } catch (e) {
            logMessage(`Error in tryClickSkipButton: ${e.message}`);
        }
    }

    // Skip ad by seeking
    async function trySkipAd() {
        if (!blockEnabled) return;

        const player = getAdPlayer();
        if (!player) return;

        logMessage(
            `Processing ad "${player.src}" at ${player.currentTime} / ${player.duration}`
        );

        if (!isFinite(player.duration)) {
            logMessage("Ad duration is not finite, skipping ad skip");
            return;
        }

        if (player.src === lastBlockedAdURL) {
            logMessage("Skipping already processed ad");
            return;
        }

        if (!isYouTubeMusic && !isYouTubeShorts) {
            const threshold = player.duration * 0.4;
            if (player.currentTime < threshold) {
                logMessage(
                    `Ad is not ready to be skipped, current time: ${player.currentTime}, threshold: ${threshold}`
                );
                return;
            }
        }

        const target = player.duration - 0.1;
        logMessage(`Skipping ad from ${player.currentTime} to ${target}`);

        player.currentTime = target;
        lastBlockedAdURL = player.src;
        lastBlockedTime = Date.now();
    }

    // Main ad checking routine
    async function checkAds() {
        if (!blockEnabled) return;

        await tryClickSkipButton();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await trySkipAd();
    }

    // Prevent YouTube's auto-pause on idle - CRITICAL FIX #2
    function setupAutoContinue() {
        const videos = document.querySelectorAll("video");
        videos.forEach((video) => {
            if (video.hasAttribute("auto-continue-listener")) return;
            video.setAttribute("auto-continue-listener", "1");

            video.addEventListener(
                "pause",
                function (e) {
                    if (!blockEnabled) return;

                    // Check if video was paused by idle detection
                    setTimeout(() => {
                        const hasIdleDialog = !!document.querySelector(
                            'yt-confirm-dialog-renderer[aria-label*="paused"], paper-dialog[role="alertdialog"], [role="alertdialog"] button'
                        );

                        // If idle dialog appeared or auto-paused (not user click), resume
                        if (video.paused && hasIdleDialog) {
                            logMessage(
                                "Idle dialog detected - clicking continue button"
                            );
                            checkIdle(); // Handle the dialog
                        } else if (
                            video.paused &&
                            !hasIdleDialog &&
                            !e.isTrusted
                        ) {
                            // Non-user pause (system pause)
                            logMessage("Auto-resuming from system pause");
                            video.play();
                        }
                    }, 300);
                },
                true
            );
        });
    }

    // Check for "Still watching?" / "Video paused" popups - CRITICAL FIX #2
    async function checkIdle() {
        if (!blockEnabled) return;

        // YouTube Music idle
        if (isYouTubeMusic) {
            const renderers = document.getElementsByTagName(
                "ytmusic-you-there-renderer"
            );
            if (renderers.length > 0) {
                const renderer = renderers[0];
                if (!renderer.checkVisibility || renderer.checkVisibility()) {
                    const button = renderer.querySelector("button");
                    if (button) {
                        logMessage(
                            `Clicking YouTube Music continue button: ${button.textContent}`
                        );
                        button.click();
                        return;
                    }
                }
            }
        }

        // Method 1: Newer YouTube structure - yt-confirm-dialog-renderer
        const confirmDialog = document.querySelector(
            "yt-confirm-dialog-renderer[aria-label*='paused'], yt-confirm-dialog-renderer"
        );
        if (confirmDialog) {
            const dialogText = (confirmDialog.textContent || "").toLowerCase();

            // Verify this is the idle/pause dialog
            if (
                dialogText.includes("video paused") ||
                dialogText.includes("continue watching") ||
                dialogText.includes("still watching") ||
                dialogText.includes("still there") ||
                dialogText.includes("paused")
            ) {
                const buttons = confirmDialog.querySelectorAll(
                    "yt-button-renderer button, button[aria-label], button"
                );

                for (const btn of buttons) {
                    const text = (btn.textContent || "").toLowerCase();
                    const ariaLabel = (
                        btn.getAttribute("aria-label") || ""
                    ).toLowerCase();

                    if (
                        text.includes("yes") ||
                        text.includes("continue") ||
                        text.includes("watch") ||
                        ariaLabel.includes("yes") ||
                        ariaLabel.includes("continue") ||
                        ariaLabel.includes("watch")
                    ) {
                        logMessage(
                            `Clicking continue button: "${btn.textContent}"`
                        );
                        btn.click();
                        return;
                    }
                }
            }
        }

        // Method 2: Legacy paper-dialog or popup-container
        const dialogs = document.querySelectorAll(
            "paper-dialog[role='alertdialog'], [role='alertdialog'], ytd-popup-container, .yt-confirm-dialog-renderer"
        );

        for (const dialog of dialogs) {
            if (!dialog.offsetWidth || !dialog.offsetHeight) continue;

            const dialogText = (dialog.textContent || "").toLowerCase();

            if (
                dialogText.includes("video paused") ||
                dialogText.includes("continue watching") ||
                dialogText.includes("still watching") ||
                dialogText.includes("still there") ||
                dialogText.includes("paused")
            ) {
                const buttons = dialog.querySelectorAll(
                    "button, yt-button-renderer button, [role='button']"
                );

                for (const btn of buttons) {
                    const text = (btn.textContent || "").toLowerCase();
                    const ariaLabel = (
                        btn.getAttribute("aria-label") || ""
                    ).toLowerCase();

                    if (
                        text.includes("yes") ||
                        text.includes("continue") ||
                        text.includes("watch") ||
                        ariaLabel.includes("yes") ||
                        ariaLabel.includes("continue") ||
                        ariaLabel.includes("watch")
                    ) {
                        logMessage(
                            `Clicking dialog continue: "${btn.textContent}"`
                        );
                        btn.click();
                        return;
                    }
                }
            }
        }

        // Method 3: Look for confirm-button in any dialog
        const confirmButtons = document.querySelectorAll(
            "#confirm-button, [data-dialog-action='confirm']"
        );

        for (const button of confirmButtons) {
            if (!button.offsetWidth || !button.offsetHeight) continue;

            const parentDialog = button.closest(
                "yt-confirm-dialog-renderer, paper-dialog, [role='alertdialog']"
            );

            if (parentDialog) {
                const dialogText = (
                    parentDialog.textContent || ""
                ).toLowerCase();

                if (
                    dialogText.includes("video paused") ||
                    dialogText.includes("continue watching") ||
                    dialogText.includes("still watching") ||
                    dialogText.includes("paused")
                ) {
                    logMessage("Clicking confirm button");
                    button.click();
                    return;
                }
            }
        }
    }

    // YouTube Shorts specific fixes - CRITICAL FIX #3
    function handleShorts() {
        if (!isYouTubeShorts) return;

        logMessage("Handling YouTube Shorts...");

        // Prevent Shorts from pausing frequently
        const shortsPlayer = document.querySelector(
            "ytd-reel-video-renderer, [data-is-shorts-video], .shorts-player"
        );
        if (shortsPlayer) {
            const videos = shortsPlayer.querySelectorAll("video");
            videos.forEach((video) => {
                if (video.hasAttribute("shorts-pause-listener")) return;
                video.setAttribute("shorts-pause-listener", "1");

                // Prevent auto-pause in Shorts
                video.addEventListener(
                    "pause",
                    function (e) {
                        if (!blockEnabled) return;

                        // Only auto-resume if this is a system pause, not user pause
                        if (!e.isTrusted) {
                            logMessage("Preventing Shorts auto-pause");
                            setTimeout(() => video.play(), 100);
                        }
                    },
                    true
                );

                // Watch for play errors (often due to ad injection)
                video.addEventListener(
                    "error",
                    function (e) {
                        logMessage(
                            `Shorts video error: ${this.error?.message}`
                        );
                        // Try to reload or skip
                        this.load();
                    },
                    true
                );
            });
        }

        // Monitor for Shorts-specific ads
        setInterval(() => {
            if (!blockEnabled) return;

            const adElements = document.querySelectorAll(
                "ytd-ad-slot-renderer, [data-ad-type], .shorts-ad"
            );

            if (adElements.length > 0) {
                logMessage(`Detected ${adElements.length} Shorts ad elements`);
                adElements.forEach((el) => {
                    if (el.style.display !== "none") {
                        el.style.display = "none";
                        logMessage("Hid Shorts ad element");
                    }
                });
            }
        }, 1000);
    }

    // YouTube Music next button fix - CRITICAL FIX #1
    function handleYouTubeMusicButtons() {
        if (!isYouTubeMusic) return;

        logMessage("Setting up YouTube Music button handlers...");

        // Find next/previous buttons and intercept them
        const setupButtonHandlers = () => {
            // Method 1: Direct button selectors
            const buttonSelectors = [
                '[data-tooltip="Next"], [aria-label*="next"]',
                '[data-tooltip="Previous"], [aria-label*="previous"]',
                'button[aria-label*="next"], button[aria-label*="previous"]',
            ];

            let found = false;

            for (const selector of buttonSelectors) {
                const buttons = document.querySelectorAll(selector);
                if (buttons.length === 0) continue;

                found = true;
                buttons.forEach((btn) => {
                    if (btn.hasAttribute("music-btn-listener")) return;
                    btn.setAttribute("music-btn-listener", "1");

                    btn.addEventListener("click", function (e) {
                        logMessage(
                            "Music button clicked, preparing for ad check"
                        );
                        // Give player time to load next track
                        setTimeout(() => {
                            checkAds();
                        }, 1500);
                    });
                });
            }

            if (found) {
                logMessage("YouTube Music button handlers attached");
                return true;
            }

            return false;
        };

        // Try setup immediately and periodically
        if (setupButtonHandlers()) return;

        // Retry until buttons are found
        const retryInterval = setInterval(() => {
            if (setupButtonHandlers()) {
                clearInterval(retryInterval);
            }
        }, 2000);
    }

    // Intercept XMLHttpRequest to capture ad slots
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
        const originalOnload = this.onload;

        if (originalOnload) {
            this.onload = function (...onloadArgs) {
                try {
                    const response = JSON.parse(this.response);

                    if ("adThrottled" in response) {
                        logMessage(
                            `Ad throttling response detected: ${response.adThrottled}`
                        );
                        if (blockEnabled && response.adSlots) {
                            logMessage(
                                `Ad slots detected: ${response.adSlots.length}`
                            );
                            adSlots = response.adSlots;
                        }
                    }
                } catch (e) {
                    // Not JSON
                }

                return originalOnload.apply(this, onloadArgs);
            };
        }

        return originalSend.apply(this, args);
    };

    // Load settings
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

    // Setup video listeners
    function setupVideoListeners() {
        const videos = document.querySelectorAll("video");
        logMessage(`Setting up listeners for ${videos.length} videos`);

        videos.forEach((video) => {
            if (video.hasAttribute("blocker-listener")) return;
            video.setAttribute("blocker-listener", "1");

            video.addEventListener("play", () => {
                logMessage("Video play - checking for ads");
                checkAds();
            });

            video.addEventListener("pause", () => {
                logMessage("Video pause - checking for idle popup");
                checkIdle();
            });

            const observer = new MutationObserver(() => {
                logMessage("Video source changed");
                checkAds();
            });

            observer.observe(video, {
                attributes: true,
                attributeFilter: ["src"],
            });
        });

        setTimeout(setupVideoListeners, 2000);
    }

    // Navigation handler
    function onNavigate() {
        logMessage("Navigation detected");
        lastBlockedAdURL = "";
        lastBlockedTime = 0;
        adSlots = [];
        setupVideoListeners();
        handleYouTubeMusicButtons();
        handleShorts();
    }

    // Setup navigation
    if (window.navigation && window.navigation.addEventListener) {
        window.navigation.addEventListener("navigate", onNavigate);
    } else {
        window.addEventListener("yt-navigate-finish", onNavigate);
    }

    // Periodic checks
    setInterval(() => {
        if (blockEnabled && getAdPlayer()) {
            checkAds();
        }
    }, 2000);

    setInterval(() => {
        if (blockEnabled) {
            checkIdle();
        }
    }, 1000);

    // Popup observer
    const popupObserver = new MutationObserver((mutations) => {
        if (!blockEnabled) return;

        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;

                const element = node;
                const classList = element.className || "";
                const tagName = element.tagName?.toLowerCase() || "";

                if (
                    classList.includes("yt-confirm-dialog") ||
                    classList.includes("ytd-popup-container") ||
                    tagName === "yt-confirm-dialog-renderer" ||
                    tagName === "paper-dialog" ||
                    element.id === "confirm-dialog" ||
                    element.getAttribute("role") === "alertdialog"
                ) {
                    const elementText = (
                        element.textContent || ""
                    ).toLowerCase();

                    if (
                        elementText.includes("video paused") ||
                        elementText.includes("continue watching") ||
                        elementText.includes("still watching") ||
                        elementText.includes("still there") ||
                        elementText.includes("paused")
                    ) {
                        logMessage("Idle popup detected via observer");
                        setTimeout(checkIdle, 100);
                    }
                    break;
                }
            }
        }
    });

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
        logMessage("Initializing YouTube Ad Blocker Enhanced");

        const success = await loadSettings();
        if (!success) {
            logMessage("Failed to load settings, retrying...");
            setTimeout(init, 1000);
            return;
        }

        setupVideoListeners();
        setupAutoContinue();
        handleYouTubeMusicButtons();
        handleShorts();

        checkAds();

        logMessage("Initialization complete");
    })();
})();
