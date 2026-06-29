// YouTube Ad Blocker - MAIN world script (has access to page context)
// Based on JAdSkip's proven approach
(function () {
    "use strict";

    let adSlots = [];
    let lastBlockedTime = 0;
    let lastBlockedAdURL = "";
    let blockEnabled = false;
    let sponsoredSweepTimeout = null;

    const scheduleSponsoredSweep = () => {
        if (!blockEnabled) return;
        if (sponsoredSweepTimeout) return;

        sponsoredSweepTimeout = setTimeout(() => {
            sponsoredSweepTimeout = null;
            hideSponsoredBlocks();
        }, 120);
    };

    const isIdleDialogText = (text) => {
        const normalized = (text || "").toLowerCase();
        return (
            normalized.includes("still watching") ||
            normalized.includes("still there") ||
            normalized.includes("continue watching") ||
            normalized.includes("video paused") ||
            normalized.includes("are you still")
        );
    };

    const clickIdleDialogButton = (dialogRoot) => {
        if (!dialogRoot || !isElementVisible(dialogRoot)) return false;
        if (!isIdleDialogText(dialogRoot.textContent)) return false;

        const buttons = dialogRoot.querySelectorAll(
            "button, yt-button-renderer button, [role='button']",
        );

        for (const button of buttons) {
            if (!isElementVisible(button)) continue;

            const buttonText = (button.textContent || "").toLowerCase();
            const ariaLabel = (
                button.getAttribute("aria-label") || ""
            ).toLowerCase();

            if (
                buttonText.includes("continue") ||
                buttonText.includes("yes") ||
                buttonText.includes("watch") ||
                ariaLabel.includes("continue") ||
                ariaLabel.includes("yes") ||
                ariaLabel.includes("watch")
            ) {
                button.click();
                logMessage("Clicked modern idle dialog confirmation button");
                return true;
            }
        }

        return false;
    };

    const getFallbackAdVideo = () => {
        const moviePlayer = document.getElementById("movie_player");
        if (!moviePlayer) return null;

        const videos = moviePlayer.querySelectorAll(
            "video.video-stream, video",
        );
        return findActiveVideo(videos);
    };

    // Try to click skip button using YouTube's Player API
    const tryClickSkipButton = async () => {
        const hasAdPlayer = !!getAdPlayerYT();
        const hasAdUi = hasAnyAdDomIndicator();

        if (!hasAdPlayer && !hasAdUi) return;

        // Prefer native UI skip buttons first when present.
        clickVisibleSkipButton();

        let player = document.getElementById("movie_player");
        if (!player) {
            logMessage("Unable to find movie player");
            return;
        }

        // Get player promise if available
        if (player.getPlayerPromise) {
            player = await player.getPlayerPromise();
        }

        if (!player.onAdUxClicked) {
            logMessage("Player does not support ad UX clicks");
            return;
        }

        // Try captured ad slots first
        if (adSlots.length > 0) {
            logMessage(`Trying ${adSlots.length} captured ad slots`);
            adSlots.forEach((slot) => {
                clickTriggers(player, slot);
            });
        }

        // Try ad slots from current player response
        const playerSlots = player.getPlayerResponse()?.adSlots;
        if (playerSlots && playerSlots.length > 0) {
            logMessage(
                `Trying ${playerSlots.length} ad slots from player response`,
            );
            playerSlots.forEach((slot) => {
                clickTriggers(player, slot);
            });
        } else {
            // Keep trying visible UI skip button if API slots are absent.
            clickVisibleSkipButton();
        }
    };

    // Try to skip ad by seeking to end
    const trySkipAd = async () => {
        const player =
            getAdPlayerYT() ||
            (hasAnyAdDomIndicator() ? getFallbackAdVideo() : null);
        if (!player) return;

        const playerSrc = player.currentSrc || player.src || "";

        logMessage(
            `Processing ad at ${player.currentTime} / ${player.duration}`,
        );

        if (!isFinite(player.duration) || player.duration <= 0) {
            logMessage("Ad duration is not finite");
            return;
        }

        if (
            playerSrc &&
            playerSrc === lastBlockedAdURL &&
            Date.now() - lastBlockedTime < 1200
        ) {
            return;
        }

        const target = Math.max(player.duration - 0.08, player.currentTime);
        logMessage(`Skipping ad from ${player.currentTime} to ${target}`);

        player.currentTime = target;
        lastBlockedAdURL = playerSrc;
        lastBlockedTime = Date.now();

        setTimeout(() => {
            if (!hasAnyAdDomIndicator()) return;
            if (!isFinite(player.duration) || player.duration <= 0) return;

            player.currentTime = Math.max(
                player.currentTime,
                player.duration - 0.03,
            );
            clickVisibleSkipButton();
        }, 140);
    };

    // Main ad checking routine
    const checkAds = async () => {
        if (!blockEnabled) return;

        hideSponsoredBlocks();
        clickVisibleSkipButton();
        await tryClickSkipButton();
        await trySkipAd();
        await new Promise((resolve) => setTimeout(resolve, 180));
        clickVisibleSkipButton();
        await trySkipAd();
        hideSponsoredBlocks();
    };

    const captureAdSlotsFromResponse = (response) => {
        const slotSources = [
            response?.adSlots,
            response?.playerResponse?.adSlots,
        ];

        for (const slots of slotSources) {
            if (Array.isArray(slots) && slots.length > 0) {
                adSlots = slots;
                return slots.length;
            }
        }

        return 0;
    };

    const stripAdFields = (payload) => {
        if (!payload || typeof payload !== "object") return false;

        let mutated = false;
        const removableKeys = [
            "adPlacements",
            "playerAds",
            "adSlots",
            "adBreakHeartbeatParams",
        ];

        removableKeys.forEach((key) => {
            if (key in payload) {
                delete payload[key];
                mutated = true;
            }
        });

        if ("adThrottled" in payload && payload.adThrottled !== true) {
            payload.adThrottled = true;
            mutated = true;
        }

        return mutated;
    };

    const stripAdPayloads = (response) => {
        let mutated = false;
        mutated = stripAdFields(response) || mutated;
        mutated = stripAdFields(response?.playerResponse) || mutated;
        return mutated;
    };

    // Check for "Still watching?" popup
    const checkIdle = async () => {
        if (!blockEnabled) return;

        const dialogSelectors = [
            "yt-confirm-dialog-renderer",
            "paper-dialog[role='alertdialog']",
            "[role='alertdialog']",
            "ytd-popup-container",
        ];

        for (const selector of dialogSelectors) {
            const dialogs = document.querySelectorAll(selector);
            for (const dialog of dialogs) {
                if (clickIdleDialogButton(dialog)) {
                    return;
                }
            }
        }

        const buttons = document.querySelectorAll("#confirm-button");
        logMessage(`Found ${buttons.length} confirm buttons`);

        for (const button of buttons) {
            if (button.checkVisibility && button.checkVisibility()) {
                const actions =
                    button.data?.serviceEndpoint?.signalServiceEndpoint
                        ?.actions;

                if (actions) {
                    actions.forEach((action) => {
                        const signal = action.signalAction?.signal;
                        if (signal === "ACKNOWLEDGE_YOUTHERE") {
                            logMessage('Clicking "Still watching?" button');
                            button.click();
                        }
                    });
                }
            }
        }
    };

    // Override XMLHttpRequest to intercept API responses
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
        const originalOnload = this.onload;

        if (originalOnload) {
            this.onload = function (...onloadArgs) {
                try {
                    const response = JSON.parse(this.response);

                    const capturedCount = captureAdSlotsFromResponse(response);

                    if (blockEnabled && stripAdPayloads(response)) {
                        Object.defineProperty(this, "response", {
                            writable: true,
                        });
                        this.response = JSON.stringify(response);
                    } else if (capturedCount > 0) {
                        logMessage(`Captured ${capturedCount} ad slots`);
                    }
                } catch (e) {
                    // Not a JSON response, continue normally
                }

                return originalOnload.apply(this, onloadArgs);
            };
        }

        return originalSend.apply(this, args);
    };

    // Listen for messages from ISOLATED world
    window.addEventListener("message", async (event) => {
        if (event.data.origin !== "ytblocker-extension") return;

        const action = event.data.action;
        logMessage(`Received action: ${action}`);

        switch (action) {
            case "setBlockEnabled":
                blockEnabled = event.data.enabled;
                logMessage(`Block enabled: ${blockEnabled}`);
                if (blockEnabled) {
                    ensureSponsoredHideStyle();
                    hideSponsoredBlocks();
                } else {
                    removeSponsoredHideStyle();
                }
                break;

            case "checkAds":
                await checkAds();
                break;

            case "checkIdle":
                await checkIdle();
                break;

            case "resetState":
                lastBlockedTime = 0;
                lastBlockedAdURL = "";
                adSlots = [];
                logMessage("State reset");
                break;
        }
    });

    const sponsoredObserver = new MutationObserver(() => {
        scheduleSponsoredSweep();
    });

    try {
        sponsoredObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    } catch (error) {
        logMessage(
            `Sponsored observer failed to start: ${error.message || error}`,
        );
    }

    logMessage("YouTube ad blocker (MAIN world) initialized");
})();
