// YouTube Music Ad Blocker - MAIN world script (has access to page context)
// Based on JAdSkip's proven approach - simplified version
(function () {
    "use strict";

    let lastBlockedTime = 0;
    let lastBlockedAdURL = "";
    let blockEnabled = false;

    // Check if current video is actually an ad
    const isCurrentVideoAd = (player) => {
        try {
            const playerResponse = player.getPlayerResponse();
            if (!playerResponse) return false;

            // CRITICAL: Check ad indicators FIRST before duration
            // YouTube Music shows ads as overlays - video duration shows song length!
            const hasAdPlacements = !!(
                playerResponse.adPlacements || playerResponse.playerAds
            );

            if (hasAdPlacements) {
                logMessage(
                    `Ad detected via adPlacements/playerAds - ad is present`
                );
                return true;
            }

            // No ad indicators - check duration as secondary verification
            const videoData = player.getVideoData();
            const duration = videoData
                ? parseFloat(videoData.duration) || player.getDuration()
                : player.getDuration();

            logMessage(`No ad indicators found - Duration: ${duration}s`);

            // If duration < 60s without ad indicators, might be a short video ad
            if (duration > 0 && duration < 60) {
                logMessage(
                    `Short video (${duration}s) without ad indicators - likely an ad`
                );
                return true;
            }

            logMessage(
                `Long video (${duration}s) - this is content, not an ad`
            );
            return false;
        } catch (e) {
            logMessage(`Error checking if video is ad: ${e.message}`);
            return false;
        }
    };

    // Try clicking skip button via YouTube API (JAdSkip approach - step 1)
    const tryClickSkipButton = async () => {
        const adPlayer = getAdPlayerYTM();
        if (!adPlayer) {
            return { hasAds: false, usedApi: false };
        }

        const playerElement = document.getElementById("player");
        if (!playerElement || !playerElement.getPlayer) {
            return { hasAds: false, usedApi: false };
        }

        const player = playerElement.getPlayer();
        if (!player) {
            logMessage("Unable to get player");
            return { hasAds: false, usedApi: false };
        }

        // CRITICAL: Check if current video is actually an ad
        const isAd = isCurrentVideoAd(player);
        if (!isAd) {
            logMessage("Current video is not an ad - skipping ad block logic");
            return { hasAds: false, usedApi: false };
        }

        // Ad detected, but check if we have ad slots to process via API
        const playerSlots = player.getPlayerResponse()?.adSlots;
        if (!playerSlots || playerSlots.length === 0) {
            logMessage(
                "Ad detected but no ad slots found - will use fallback skip method"
            );
            return { hasAds: true, usedApi: false };
        }

        logMessage(
            `Trying ad slots from player response: ${playerSlots.length}`
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

        return { hasAds: true, usedApi: true };
    };

    // Try skipping ad by seeking to end (JAdSkip approach - step 2)
    const trySkipAd = async () => {
        const adPlayer = getAdPlayerYTM();
        if (!adPlayer) {
            return;
        }

        logMessage(
            `Processing ad "${adPlayer.src}" at ${adPlayer.currentTime} / ${adPlayer.duration}`
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
    };

    // Main ad checking routine - EXACTLY like JAdSkip
    const checkAds = async () => {
        if (!blockEnabled) return;

        // Step 1: Trigger YouTube's internal skip API first
        const result = await tryClickSkipButton();

        // CRITICAL: Only proceed if ad was detected
        // Without this check, we skip CONTENT videos!
        if (!result.hasAds) {
            return;
        }

        // Step 2: Wait 1 second for ad video to load (critical!)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Step 3: Seek ad video to end as backup
        // - If API was used (result.usedApi = true), this is a fallback in case API failed
        // - If API wasn't used (result.usedApi = false), this is the primary skip method
        await trySkipAd();
    };

    // Check for "Still watching?" popup (YouTube Music specific)
    const checkIdle = async () => {
        if (!blockEnabled) return;

        const renderers = document.getElementsByTagName(
            "ytmusic-you-there-renderer"
        );
        logMessage(`Found ${renderers.length} YouThere renderers`);

        if (renderers.length === 0) return;

        const renderer = renderers[0];
        if (!renderer.checkVisibility || !renderer.checkVisibility()) return;

        const button = renderer.querySelector("button");
        if (button) {
            logMessage(
                `Clicking YouTube Music continue button: ${button.textContent}`
            );
            button.click();
        }
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
                logMessage("[YTM] State reset");
                break;
        }
    });

    logMessage("YouTube Music ad blocker (MAIN world) initialized");
})();
