// Shared functions for YouTube Ad Blocking - runs in MAIN world
// This file has access to the page's JavaScript context and YouTube's internal APIs

const logMessage = (message) => {
    window.postMessage({
        action: "log",
        origin: "ytblocker-main",
        message: message,
    });
    console.log(`[YouTube Blocker MAIN] ${message}`);
};

// Check if ad module has ads
const hasAds = (adsModule) => {
    if (!adsModule || !adsModule[0]) return false;
    return adsModule[0].childElementCount > 0;
};

// Get the ad player element (YouTube specific)
const getAdPlayerYT = () => {
    const moviePlayer = document.getElementById("movie_player");
    if (!moviePlayer) {
        return null;
    }

    const videoStream = moviePlayer.getElementsByClassName("video-stream");
    const adsModule = moviePlayer.getElementsByClassName("ytp-ad-module");

    if (videoStream.length && adsModule.length && hasAds(adsModule)) {
        return videoStream[0];
    }

    return null;
};

// Get the ad player element (YouTube Music specific)
const getAdPlayerYTM = () => {
    // Check for ad container first - YouTube Music shows ads in specific containers
    const adContainer = document.querySelector('.advertisement, [class*="ad-showing"], .video-ads');
    if (!adContainer) {
        return null; // No ad container means no ad is playing
    }

    // Look for ad indicators in the player
    const playerBar = document.querySelector('ytmusic-player-bar');
    if (playerBar) {
        const adBadge = playerBar.querySelector('.advertisement-div-text, .ytp-ad-text, [class*="ad-badge"]');
        if (!adBadge) {
            return null; // No ad badge means this is regular content
        }
    }

    // Now find the video element that's actually playing an ad
    const videos = document.querySelectorAll("video");
    for (const video of videos) {
        const src = video.src || "";
        if (src.includes("googlevideo.com") && video.duration > 0) {
            // Additional check: verify this is in an ad context
            const parent = video.closest('.html5-video-container, ytmusic-player');
            if (parent && parent.querySelector('.advertisement, [class*="ad-"]')) {
                return video;
            }
        }
    }
    
    return null;
};

// Click ad skip triggers using YouTube's internal API
const clickTriggers = (player, slot) => {
    if (!slot || !slot.adSlotRenderer) return;

    const triggers =
        slot.adSlotRenderer.fulfillmentContent?.fulfilledLayout
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
};
