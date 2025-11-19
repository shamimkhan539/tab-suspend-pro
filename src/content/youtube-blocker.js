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
            (document.body &&
                document.body.classList &&
                document.body.classList.contains("ytd-shorts")));

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
            // YouTube Music: Enhanced ad detection
            else if (isYouTubeMusic) {
                // Check if this is an ad by multiple criteria
                const isAdVideo =
                    src.includes("googlevideo.com") ||
                    video.className.includes("ad") ||
                    video.closest(
                        ".advertisement, .ad-showing, [class*=ad-], ytmusic-companion"
                    ) ||
                    (video.duration > 0 && video.duration < 120);

                if (isAdVideo) {
                    // Additional check: see if player shows ad indicator
                    const playerAd = document.querySelector(
                        '.advertisement, .video-ads, ytmusic-player-bar[ad], [class*="ad-playing"]'
                    );
                    if (playerAd || src.includes("googlevideo.com")) {
                        logMessage(
                            `YouTube Music ad detected: duration=${
                                video.duration
                            }s, src=${src.substring(0, 50)}...`
                        );
                        return video;
                    }
                }
            }
            // Regular YouTube: check for specific ad URL and duration
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

        // Skip if already processed this ad URL (with timeout check)
        const timeSinceLastBlock = Date.now() - lastBlockedTime;
        if (player.src === lastBlockedAdURL && timeSinceLastBlock < 5000) {
            logMessage("Skipping already processed ad");
            return;
        }

        // For YouTube Music: be extra aggressive
        if (isYouTubeMusic) {
            // Try to mute the ad first
            player.muted = true;
            player.volume = 0;

            // Immediately seek to end
            const target = player.duration - 0.05;
            logMessage(
                `[YouTube Music] Aggressively skipping ad from ${player.currentTime} to ${target}`
            );
            player.currentTime = target;

            // Also try to trigger next track
            setTimeout(() => {
                const nextButton = document.querySelector(
                    'button[aria-label*="Next"], button[aria-label*="next"], [data-tooltip="Next"]'
                );
                if (nextButton) {
                    logMessage(
                        "[YouTube Music] Clicking next button to skip ad"
                    );
                    nextButton.click();
                }
            }, 100);
        }
        // For Shorts: Skip immediately (no threshold)
        else if (isYouTubeShorts) {
            const target = player.duration - 0.1;
            logMessage(
                `[Shorts] Skipping ad from ${player.currentTime} to ${target}`
            );
            player.currentTime = target;
        }
        // For regular YouTube: Wait until 40% through ad (prevents detection)
        else {
            const threshold = player.duration * 0.4;
            if (player.currentTime < threshold) {
                logMessage(
                    `Ad is not ready to be skipped, current time: ${player.currentTime}, threshold: ${threshold}`
                );
                return;
            }

            const target = player.duration - 0.1;
            logMessage(`Skipping ad from ${player.currentTime} to ${target}`);
            player.currentTime = target;
        }

        lastBlockedAdURL = player.src;
        lastBlockedTime = Date.now();
    }

    // Remove visual ad elements (YouTube Music specific)
    function removeYouTubeMusicAdElements() {
        if (!isYouTubeMusic || !blockEnabled) return;

        const adSelectors = [
            // Ad overlays and banners
            ".advertisement",
            ".video-ads",
            "ytmusic-companion",
            '[class*="ad-showing"]',
            '[class*="ad-playing"]',
            "ytmusic-promoted-sparkles-web-renderer",
            "ytmusic-display-ad-renderer",
            'ytmusic-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
            // Companion ads
            "[data-ad-id]",
            '[id^="player-ads"]',
            ".ytp-ad-overlay-container",
            ".ytp-ad-text",
            ".ytp-ad-player-overlay",
            // Skip ad indicators
            ".ytp-ad-skip-button-container",
            ".ytp-ad-preview-container",
        ];

        let removedCount = 0;
        adSelectors.forEach((selector) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el) => {
                if (el && el.style.display !== "none") {
                    el.style.display = "none";
                    el.remove();
                    removedCount++;
                }
            });
        });

        if (removedCount > 0) {
            logMessage(`Removed ${removedCount} YouTube Music ad elements`);
        }
    }

    // Main ad checking routine (JAdSkip's order of operations)
    async function checkAds() {
        if (!blockEnabled) return;

        // 0. Remove visual ad elements (YouTube Music)
        if (isYouTubeMusic) {
            removeYouTubeMusicAdElements();
        }

        // 1. Try clicking skip button first (using Player API)
        await tryClickSkipButton();

        // 2. Wait 1 second (important for skip button to register)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 3. Try seeking to skip ad
        await trySkipAd();
    }

    // YouTube Music next button fix - CRITICAL FIX #1
    function handleYouTubeMusicButtons() {
        if (!isYouTubeMusic) return;

        logMessage("Setting up YouTube Music button handlers...");

        const setupButtonHandlers = () => {
            // Find next/previous buttons and intercept them
            const buttonSelectors = [
                '[data-tooltip="Next"], [aria-label*="next"]',
                '[data-tooltip="Previous"], [aria-label*="previous"]',
                'button[aria-label*="next"], button[aria-label*="previous"]',
                // Additional selectors for different YouTube Music versions
                'button[jsaction*="next"]',
                'button[jsaction*="previous"]',
                '[role="button"][aria-label*="next"]',
                '[role="button"][aria-label*="previous"]',
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
                        // Check for ads immediately and then again after track loads
                        checkAds();
                        setTimeout(() => {
                            checkAds();
                        }, 1000);
                        setTimeout(() => {
                            checkAds();
                        }, 2500);
                    });
                });
            }

            if (found) {
                logMessage("YouTube Music button handlers attached");
                return true;
            }

            return false;
        };

        if (setupButtonHandlers()) return;

        const retryInterval = setInterval(() => {
            if (setupButtonHandlers()) {
                clearInterval(retryInterval);
            }
        }, 2000);
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

                    setTimeout(() => {
                        const hasIdleDialog = !!document.querySelector(
                            'yt-confirm-dialog-renderer[aria-label*="paused"], paper-dialog[role="alertdialog"], [role="alertdialog"] button'
                        );

                        if (video.paused && hasIdleDialog) {
                            logMessage("Idle dialog detected - checking idle");
                            checkIdle();
                        } else if (
                            video.paused &&
                            !hasIdleDialog &&
                            !e.isTrusted
                        ) {
                            logMessage("Auto-resuming from system pause");
                            video.play();
                        }
                    }, 300);
                },
                true
            );
        });
    }

    // YouTube Shorts specific fixes - CRITICAL FIX #3
    function handleShorts() {
        if (!isYouTubeShorts) return;

        logMessage("Handling YouTube Shorts...");

        const shortsPlayer = document.querySelector(
            "ytd-reel-video-renderer, [data-is-shorts-video], .shorts-player"
        );
        if (shortsPlayer) {
            const videos = shortsPlayer.querySelectorAll("video");
            videos.forEach((video) => {
                if (video.hasAttribute("shorts-pause-listener")) return;
                video.setAttribute("shorts-pause-listener", "1");

                video.addEventListener(
                    "pause",
                    function (e) {
                        if (!blockEnabled) return;

                        if (!e.isTrusted) {
                            logMessage("Preventing Shorts auto-pause");
                            setTimeout(() => video.play(), 100);
                        }
                    },
                    true
                );

                video.addEventListener(
                    "error",
                    function (e) {
                        logMessage(
                            `Shorts video error: ${this.error?.message}`
                        );
                        this.load();
                    },
                    true
                );
            });
        }

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

            // YouTube Music specific: Monitor for ad loading
            if (isYouTubeMusic) {
                video.addEventListener("loadedmetadata", () => {
                    if (video.duration > 0 && video.duration < 120) {
                        logMessage(
                            `[YouTube Music] Potential ad detected on loadedmetadata: duration=${video.duration}s`
                        );
                        checkAds();
                    }
                });

                video.addEventListener("timeupdate", () => {
                    const player = getAdPlayer();
                    if (player === video && blockEnabled) {
                        // Continuously skip ads as they play
                        if (video.currentTime < video.duration - 0.5) {
                            video.currentTime = video.duration - 0.1;
                        }
                    }
                });
            }

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
        handleYouTubeMusicButtons();
        handleShorts();
    }

    // Setup navigation listeners
    if (window.navigation && window.navigation.addEventListener) {
        window.navigation.addEventListener("navigate", onNavigate);
    } else {
        window.addEventListener("yt-navigate-finish", onNavigate);
    }

    // YouTube Music Ad Observer - watches for ad elements being added to DOM
    if (isYouTubeMusic) {
        const ytMusicAdObserver = new MutationObserver((mutations) => {
            if (!blockEnabled) return;

            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;

                    const element = node;
                    const classList = element.className || "";
                    const tagName = element.tagName?.toLowerCase() || "";

                    // Detect ad-related elements
                    if (
                        classList.includes("advertisement") ||
                        classList.includes("ad-showing") ||
                        classList.includes("ad-playing") ||
                        tagName === "ytmusic-companion" ||
                        tagName === "ytmusic-promoted-sparkles-web-renderer" ||
                        tagName === "ytmusic-display-ad-renderer" ||
                        element.hasAttribute("data-ad-id")
                    ) {
                        logMessage(
                            `YouTube Music ad element detected: ${tagName}, removing...`
                        );
                        element.remove();
                        checkAds();
                    }
                }
            }
        });

        // Start observing when body is ready
        function startYTMusicAdObserver() {
            if (document.body) {
                ytMusicAdObserver.observe(document.body, {
                    childList: true,
                    subtree: true,
                });
                logMessage("YouTube Music ad observer started");
            } else {
                setTimeout(startYTMusicAdObserver, 100);
            }
        }
        startYTMusicAdObserver();
    }

    // Periodic ad checking (every 2 seconds when video is playing, every 500ms for YouTube Music)
    setInterval(
        () => {
            if (blockEnabled && getAdPlayer()) {
                logMessage("Periodic check: Ad detected");
                checkAds();
            }
        },
        isYouTubeMusic ? 500 : 2000
    );

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
                const role = element.getAttribute("role") || "";

                // Detect popup containers
                if (
                    classList.includes("yt-confirm-dialog") ||
                    classList.includes("ytd-popup-container") ||
                    tagName === "yt-confirm-dialog-renderer" ||
                    tagName === "paper-dialog" ||
                    role === "alertdialog" ||
                    element.id === "confirm-dialog"
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
                        logMessage(
                            "Idle popup detected via observer, checking idle"
                        );
                        setTimeout(checkIdle, 100);
                    }
                    break;
                }
            }
        }
    });

    // Function to start popup observer when body is available
    function startPopupObserver() {
        if (!document.body) {
            // Wait for body to be available
            if (document.readyState === "loading") {
                document.addEventListener(
                    "DOMContentLoaded",
                    startPopupObserver
                );
            } else {
                // Fallback: retry after a short delay
                setTimeout(startPopupObserver, 100);
            }
            return;
        }

        try {
            popupObserver.observe(document.body, {
                childList: true,
                subtree: true,
            });
            logMessage("Popup observer started");
        } catch (e) {
            logMessage(`Could not start popup observer: ${e.message}`);
        }
    }

    // Inject CSS to hide YouTube Music ad elements
    function injectAdBlockingCSS() {
        if (!isYouTubeMusic) return;

        const style = document.createElement("style");
        style.id = "ytmusic-ad-blocker-css";
        style.textContent = `
            /* Hide YouTube Music ad elements */
            ytmusic-companion,
            ytmusic-promoted-sparkles-web-renderer,
            ytmusic-display-ad-renderer,
            ytmusic-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
            .advertisement,
            .video-ads,
            [class*="ad-showing"],
            [class*="ad-playing"],
            [data-ad-id],
            [id^="player-ads"],
            .ytp-ad-overlay-container,
            .ytp-ad-text,
            .ytp-ad-player-overlay,
            .ytp-ad-skip-button-container,
            .ytp-ad-preview-container {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                position: absolute !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
            }
        `;

        // Wait for head to be available
        function addStyle() {
            if (document.head) {
                // Remove existing style if present
                const existing = document.getElementById(
                    "ytmusic-ad-blocker-css"
                );
                if (existing) existing.remove();

                document.head.appendChild(style);
                logMessage("YouTube Music ad-blocking CSS injected");
            } else {
                setTimeout(addStyle, 100);
            }
        }
        addStyle();
    }

    // Initialize
    (async function init() {
        logMessage("Initializing YouTube Ad Blocker Enhanced");

        // Load settings
        const success = await loadSettings();
        if (!success) {
            logMessage("Failed to load settings, retrying in 1 second...");
            setTimeout(init, 1000);
            return;
        }

        // Inject CSS to hide ads (YouTube Music)
        if (isYouTubeMusic) {
            injectAdBlockingCSS();
        }

        // Start popup observer when body is ready
        startPopupObserver();

        // Setup video listeners
        setupVideoListeners();
        setupAutoContinue();
        handleYouTubeMusicButtons();
        handleShorts();

        // Initial checks
        checkAds();

        logMessage("Initialization complete");
    })();
})();
