// YouTube Music Ad Blocker - MAIN world script (has access to page context)
// Based on JAdSkip's proven approach
(function () {
    "use strict";

    let lastBlockedTime = 0;
    let lastBlockedAdURL = "";
    let blockEnabled = false;

    // Try to click skip button using YouTube Music's Player API
    const tryClickSkipButton = async () => {
        if (!getAdPlayerYTM()) return;

        const playerElement = document.getElementById("player");
        if (!playerElement || !playerElement.getPlayer) {
            logMessage("Unable to get YouTube Music player");
            return;
        }

        const player = playerElement.getPlayer();
        if (!player) {
            logMessage("Player instance not available");
            return;
        }

        const playerSlots = player.getPlayerResponse()?.adSlots;
        if (!playerSlots) {
            logMessage("No ad slots in player response");
            return;
        }

        logMessage(
            `Trying ${playerSlots.length} ad slots from YouTube Music player`
        );
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
                    logMessage(`Clicked skip trigger: ${triggeringLayoutId}`);
                }
            });
        });
    };

    // Try to skip ad by seeking to end (immediate for YouTube Music)
    const trySkipAd = async () => {
        const player = getAdPlayerYTM();
        if (!player) return;

        logMessage(
            `Processing YTM ad at ${player.currentTime} / ${player.duration}`
        );

        if (!isFinite(player.duration)) {
            logMessage("Ad duration is not finite");
            return;
        }

        if (player.src === lastBlockedAdURL) {
            logMessage("Already processed this ad");
            return;
        }

        // YouTube Music: Skip immediately (no threshold)
        const target = player.duration - 0.1;
        logMessage(`Skipping YTM ad from ${player.currentTime} to ${target}`);

        player.currentTime = target;
        lastBlockedAdURL = player.src;
        lastBlockedTime = Date.now();
    };

    // Main ad checking routine
    const checkAds = async () => {
        if (!blockEnabled) return;

        await tryClickSkipButton();
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
