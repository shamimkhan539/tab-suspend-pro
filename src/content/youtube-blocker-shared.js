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
// Simplified JAdSkip approach - just return the active video element
const getAdPlayerYTM = () => {
    const videos = document.querySelectorAll("video");

    // Return the first playing video (YouTube Music typically has one main video)
    for (const video of videos) {
        if (!video.paused && video.duration > 0) {
            return video;
        }
    }

    // Fallback: return first video with valid source
    for (const video of videos) {
        const src = video.src || "";
        if (src.includes("googlevideo.com") && video.duration > 0) {
            return video;
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
