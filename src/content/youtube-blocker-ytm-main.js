// YouTube Music Ad Blocker - MAIN world script (has access to page context)
// Based on JAdSkip's proven approach - simplified version
(function () {
    "use strict";

    let lastBlockedTime = 0;
    let lastBlockedAdURL = "";
    let blockEnabled = false;
    let adSlots = [];

    const hasMusicAdDomIndicators = () => hasAnyAdDomIndicator();

    const getMusicPlayer = () =>
        document.getElementById("player")?.getPlayer?.() || null;

    const clickMusicNextButton = () => {
        const nextButton = document.querySelector(
            'ytmusic-player-bar button[aria-label*="Next" i], button[data-tooltip*="Next" i], [role="button"][aria-label*="Next" i]',
        );

        if (nextButton && isElementVisible(nextButton)) {
            nextButton.click();
            logMessage(
                "[YTM] Clicked next button while ad indicators were active",
            );
            return true;
        }

        return false;
    };

    // Check if current video is actually an ad
    const isCurrentVideoAd = (player) => {
        try {
            const playerResponse = player.getPlayerResponse();
            if (!playerResponse) {
                return hasMusicAdDomIndicators();
            }

            // CRITICAL: Check ad indicators FIRST before duration
            // YouTube Music shows ads as overlays - video duration shows song length!
            // Use Array.isArray + length check — !!(adPlacements) is TRUE even for []
            const hasAdPlacements =
                (Array.isArray(playerResponse.adPlacements) &&
                    playerResponse.adPlacements.length > 0) ||
                (Array.isArray(playerResponse.playerAds) &&
                    playerResponse.playerAds.length > 0) ||
                (Array.isArray(playerResponse.adSlots) &&
                    playerResponse.adSlots.length > 0);

            if (hasAdPlacements) {
                logMessage(
                    `Ad detected via adPlacements/playerAds - ad is present`,
                );
                return true;
            }

            if (hasMusicAdDomIndicators()) {
                logMessage("Ad detected via DOM ad indicators");
                return true;
            }

            // No ad placement indicators found — this is content, not an ad.
            // Do NOT use duration as a fallback: songs on YouTube Music can be
            // any length, including under 60 seconds.
            logMessage(`No ad indicators found - treating as content`);
            return false;
        } catch (e) {
            logMessage(`Error checking if video is ad: ${e.message}`);
            return false;
        }
    };

    // Try clicking skip button via YouTube API (JAdSkip approach - step 1)
    const tryClickSkipButton = async () => {
        const adPlayer = getAdPlayerYTM();
        const hasAdIndicators = !!adPlayer || hasMusicAdDomIndicators();
        if (!hasAdIndicators) {
            return { hasAds: false, usedApi: false };
        }

        clickVisibleSkipButton();

        const player = getMusicPlayer();
        if (!player) {
            logMessage("Unable to get player");
            return { hasAds: true, usedApi: false };
        }

        // CRITICAL: Check if current video is actually an ad
        const isAd = isCurrentVideoAd(player);
        if (!isAd) {
            logMessage(
                "Current video is not flagged as ad by player response; keeping fallback checks active",
            );
            return { hasAds: hasMusicAdDomIndicators(), usedApi: false };
        }

        // Ad detected, but check if we have ad slots to process via API
        const playerSlots =
            player.getPlayerResponse()?.adSlots ||
            (Array.isArray(adSlots) ? adSlots : []);
        if (!playerSlots || playerSlots.length === 0) {
            logMessage(
                "Ad detected but no ad slots found - will use fallback skip method",
            );
            clickVisibleSkipButton();
            return { hasAds: true, usedApi: false };
        }

        logMessage(
            `Trying ad slots from player response: ${playerSlots.length}`,
        );

        // Trigger all skip events via YouTube's internal API
        playerSlots.forEach((slot) => {
            const triggers =
                slot.adSlotRenderer?.fulfillmentContent?.fulfilledLayout
                    ?.playerBytesAdLayoutRenderer?.layoutExitSkipTriggers;

            if (!triggers) return;

            triggers.forEach((trigger) => {
                const triggeringLayoutId =
                    trigger.skipRequestedTrigger?.triggeringLayoutId;
                if (triggeringLayoutId) {
                    player.onAdUxClicked("skip-button", triggeringLayoutId);
                }
            });
        });

        clickVisibleSkipButton();

        return { hasAds: true, usedApi: true };
    };

    // Try skipping ad by seeking to end (JAdSkip approach - step 2)
    const trySkipAd = async () => {
        const adPlayer = getAdPlayerYTM();
        if (!adPlayer) {
            return;
        }

        const player = getMusicPlayer();
        if (player && !isCurrentVideoAd(player) && !hasMusicAdDomIndicators()) {
            logMessage(
                "[YTM] Skip aborted because ad indicators are no longer active",
            );
            return;
        }

        logMessage(
            `Processing ad "${adPlayer.src}" at ${adPlayer.currentTime} / ${adPlayer.duration}`,
        );

        if (!isFinite(adPlayer.duration)) {
            logMessage("Ad duration is not finite, skipping ad skip");
            return;
        }

        if (adPlayer.src === lastBlockedAdURL) {
            logMessage("Skipping already processed ad");
            return;
        }

        const target = adPlayer.duration - 0.1;
        logMessage(`Skipping ad from ${adPlayer.currentTime} to ${target}`);

        adPlayer.currentTime = target;
        lastBlockedAdURL = adPlayer.src;
        lastBlockedTime = Date.now();

        setTimeout(() => {
            if (hasMusicAdDomIndicators()) {
                clickVisibleSkipButton();
                clickMusicNextButton();
            }
        }, 150);
    };

    // Main ad checking routine - EXACTLY like JAdSkip
    const checkAds = async () => {
        if (!blockEnabled) return;

        clickVisibleSkipButton();

        // Step 1: Trigger YouTube's internal skip API first
        const result = await tryClickSkipButton();

        // CRITICAL: Only proceed if ad was detected
        // Without this check, we skip CONTENT videos!
        if (!result.hasAds) {
            return;
        }

        // Step 2: Wait 1 second for ad video to load (critical!)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        clickVisibleSkipButton();

        // Step 3: Seek ad video to end as backup
        // - If API was used (result.usedApi = true), this is a fallback in case API failed
        // - If API wasn't used (result.usedApi = false), this is the primary skip method
        await trySkipAd();
    };

    // Check for "Still watching?" popup (YouTube Music specific)
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
                if (!isElementVisible(dialog)) continue;

                const dialogText = (dialog.textContent || "").toLowerCase();
                if (
                    dialogText.includes("still watching") ||
                    dialogText.includes("continue watching") ||
                    dialogText.includes("video paused") ||
                    dialogText.includes("still there")
                ) {
                    const buttons = dialog.querySelectorAll(
                        "button, yt-button-renderer button, [role='button']",
                    );

                    for (const button of buttons) {
                        if (!isElementVisible(button)) continue;
                        const text = (button.textContent || "").toLowerCase();
                        const aria = (
                            button.getAttribute("aria-label") || ""
                        ).toLowerCase();
                        if (
                            text.includes("continue") ||
                            text.includes("yes") ||
                            aria.includes("continue") ||
                            aria.includes("yes")
                        ) {
                            button.click();
                            logMessage("[YTM] Clicked idle continue button");
                            return;
                        }
                    }
                }
            }
        }

        const renderers = document.getElementsByTagName(
            "ytmusic-you-there-renderer",
        );
        logMessage(`Found ${renderers.length} YouThere renderers`);

        if (renderers.length === 0) return;

        const renderer = renderers[0];
        if (!renderer.checkVisibility || !renderer.checkVisibility()) return;

        const button = renderer.querySelector("button");
        if (button) {
            logMessage(
                `Clicking YouTube Music continue button: ${button.textContent}`,
            );
            button.click();
        }
    };

    // Override XMLHttpRequest to capture and strip ad payloads / idle prompts
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
        const originalOnload = this.onload;

        if (originalOnload) {
            this.onload = function (...onloadArgs) {
                try {
                    const response = JSON.parse(this.response);
                    let didMutate = false;

                    if (
                        Array.isArray(response.adSlots) &&
                        response.adSlots.length > 0
                    ) {
                        adSlots = response.adSlots;
                        logMessage(
                            `[YTM] Captured ${response.adSlots.length} ad slots from XHR`,
                        );

                        if (blockEnabled) {
                            delete response.adSlots;
                            didMutate = true;
                        }
                    }

                    if (Array.isArray(response.messages) && blockEnabled) {
                        const filteredMessages = response.messages.filter(
                            (message) => !message.youThereRenderer,
                        );

                        if (
                            filteredMessages.length !== response.messages.length
                        ) {
                            response.messages = filteredMessages;
                            didMutate = true;
                            logMessage(
                                "[YTM] Removed YouThere prompts from XHR response",
                            );
                        }
                    }

                    if (didMutate) {
                        Object.defineProperty(this, "response", {
                            writable: true,
                        });
                        this.response = JSON.stringify(response);
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
        logMessage(`[YTM] Received action: ${action}`);

        switch (action) {
            case "setBlockEnabled":
                blockEnabled = event.data.enabled;
                logMessage(`[YTM] Block enabled: ${blockEnabled}`);
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
                logMessage("[YTM] State reset");
                break;
        }
    });

    logMessage("YouTube Music ad blocker (MAIN world) initialized");
})();
