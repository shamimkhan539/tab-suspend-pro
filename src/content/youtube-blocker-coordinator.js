// YouTube Ad Blocker Coordinator - ISOLATED world (handles Chrome extension API)
// Communicates with MAIN world scripts via window.postMessage
(function () {
    "use strict";

    const MUTATE_INTERVAL = 500;
    const MAX_MUTATE_CHECK_TIME = 10000;
    const MAX_MUTATE_RETRY = MAX_MUTATE_CHECK_TIME / MUTATE_INTERVAL;
    const SKIPPED_TAG_NAME = "ytblocker-listener";

    const hostname = window.location.hostname;
    const isYouTube =
        hostname.includes("youtube.com") || hostname.includes("youtu.be");
    const isYouTubeMusic = hostname.includes("music.youtube.com");

    if (!isYouTube && !isYouTubeMusic) {
        return;
    }

    console.log(`[YouTube Blocker Coordinator] Initialized on ${hostname}`);

    let checkAdTimeout = null;
    let checkIdleTimeout = null;
    let blockEnabled = false;

    // Load settings from background
    async function loadSettings() {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage(
                    { action: "get-youtube-blocker-settings" },
                    function (response) {
                        if (chrome.runtime.lastError) {
                            console.error(
                                `[YouTube Blocker] Error loading settings: ${chrome.runtime.lastError.message}`
                            );
                            resolve(false);
                            return;
                        }

                        if (response) {
                            const shouldBlock = isYouTubeMusic
                                ? response.blockYoutubeMusicAds
                                : response.blockYoutubeAds;

                            blockEnabled = shouldBlock || false;

                            // Send to MAIN world
                            window.postMessage({
                                origin: "ytblocker-extension",
                                action: "setBlockEnabled",
                                enabled: blockEnabled,
                            });

                            console.log(
                                `[YouTube Blocker] Settings loaded: blockEnabled=${blockEnabled}`
                            );
                            resolve(true);
                        } else {
                            console.error(
                                "[YouTube Blocker] No response from background"
                            );
                            resolve(false);
                        }
                    }
                );
            } catch (error) {
                console.error(
                    `[YouTube Blocker] Error sending message: ${error.message}`
                );
                resolve(false);
            }
        });
    }

    // Check for ads (with retry) - INSTANT on first call for immediate blocking
    function checkAdPresence(retry) {
        if (retry >= MAX_MUTATE_RETRY) return;
        if (!blockEnabled) return;

        // Send checkAds immediately (no delay)
        window.postMessage({
            origin: "ytblocker-extension",
            action: "checkAds",
        });

        if (checkAdTimeout) clearTimeout(checkAdTimeout);

        // For YouTube Music, check again quickly to catch any delayed ad loads
        // First retry after 50ms, then use normal 500ms interval
        const nextInterval = retry === 0 ? 50 : MUTATE_INTERVAL;
        checkAdTimeout = setTimeout(() => {
            checkAdPresence(retry + 1);
        }, nextInterval);
    }

    // Check for idle popup (with retry)
    function checkIdleInteraction(retry) {
        if (retry >= MAX_MUTATE_RETRY) return;
        if (!blockEnabled) return;

        window.postMessage({
            origin: "ytblocker-extension",
            action: "checkIdle",
        });

        if (checkIdleTimeout) clearTimeout(checkIdleTimeout);
        checkIdleTimeout = setTimeout(() => {
            checkIdleInteraction(retry + 1);
        }, MUTATE_INTERVAL);
    }

    // Register video listeners
    const videoCallback = (mutationList) => {
        mutationList.forEach((mutation) => {
            if (mutation.attributeName === "src") {
                console.log("[YouTube Blocker] Video source changed");
                checkAdPresence(0);
            }
        });
    };

    function registerVideoListener(video) {
        if (video.getAttribute(SKIPPED_TAG_NAME) === "1") {
            return;
        }

        video.setAttribute(SKIPPED_TAG_NAME, "1");

        const observer = new MutationObserver(videoCallback);
        observer.observe(video, {
            attributes: true,
            childList: true,
            subtree: true,
        });

        video.addEventListener("pause", () => {
            if (checkAdTimeout) clearTimeout(checkAdTimeout);
            checkIdleInteraction(0);
        });

        video.addEventListener("play", () => {
            if (checkIdleTimeout) clearTimeout(checkIdleTimeout);
            checkAdPresence(0);
        });

        // Add timeupdate listener to catch ads that don't trigger src changes
        video.addEventListener("timeupdate", () => {
            // Check periodically during playback (every 2 seconds)
            if (!video._lastAdCheck || Date.now() - video._lastAdCheck > 2000) {
                video._lastAdCheck = Date.now();
                checkAdPresence(0);
            }
        });

        checkAdPresence(0);
    }

    let videoRegistrationTimeout = null;

    function setupVideoListeners() {
        const playerVideo = document.querySelector("#player video");

        if (playerVideo) {
            registerVideoListener(playerVideo);
        } else {
            const videos = document.querySelectorAll("video");
            console.log(`[YouTube Blocker] Found ${videos.length} videos`);
            videos.forEach(registerVideoListener);
        }

        if (videoRegistrationTimeout) clearTimeout(videoRegistrationTimeout);
        videoRegistrationTimeout = setTimeout(setupVideoListeners, 1000);
    }

    // Handle navigation
    function onNavigate() {
        console.log("[YouTube Blocker] Navigation detected");

        window.postMessage({
            origin: "ytblocker-extension",
            action: "resetState",
        });

        if (videoRegistrationTimeout) clearTimeout(videoRegistrationTimeout);
        if (checkAdTimeout) clearTimeout(checkAdTimeout);
        if (checkIdleTimeout) clearTimeout(checkIdleTimeout);

        setupVideoListeners();
    }

    // Listen for navigation events
    if (window.navigation && window.navigation.addEventListener) {
        window.navigation.addEventListener("navigate", onNavigate);
    } else {
        window.addEventListener("yt-navigate-finish", onNavigate);
    }

    // Listen for messages from MAIN world
    window.addEventListener("message", (event) => {
        if (event.data.origin === "ytblocker-main") {
            if (event.data.action === "log") {
                console.log(`[YouTube Blocker MAIN] ${event.data.message}`);
            }
        }
    });

    // Listen for settings changes from background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "youtube-blocker-settings-changed") {
            console.log("[YouTube Blocker] Settings changed, reloading");
            loadSettings().then(() => {
                checkAdPresence(0);
            });
            sendResponse({ success: true });
            return true;
        }
    });

    // Initialize
    (async function init() {
        console.log("[YouTube Blocker] Initializing coordinator...");

        const success = await loadSettings();
        if (!success) {
            console.log(
                "[YouTube Blocker] Failed to load settings, retrying..."
            );
            setTimeout(init, 1000);
            return;
        }

        setupVideoListeners();
        onNavigate();

        console.log("[YouTube Blocker] Coordinator initialized successfully");
    })();
})();
