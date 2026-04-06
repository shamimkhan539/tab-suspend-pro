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

// Get the ad player element (YouTube Music specific).
// IMPORTANT: Only return a video element when ad UI is actually visible in the DOM.
// Without this guard, the function returns the currently-playing song and
// trySkipAd() seeks it to its end — causing songs to skip after 1-2 seconds.
const getAdPlayerYTM = () => {
    // Check for ad-specific UI elements that are only rendered during active ad playback.
    const hasActiveAdUI =
        // Video ad module inside the embedded YouTube player (populated only during an ad)
        !!document.querySelector(".ytp-ad-module:not(:empty)") ||
        // Ad overlay / skip elements — only present while a video ad is playing
        !!document.querySelector(".ytp-ad-player-overlay") ||
        !!document.querySelector(".ytp-ad-skip-button-container") ||
        !!document.querySelector(".ytp-skip-ad-button") ||
        // YouTube Music audio / promo ad bar
        !!document.querySelector("ytmusic-mealbar-promo-renderer");

    if (!hasActiveAdUI) return null;

    // Ad is confirmed visible — return the playing video element
    const videos = document.querySelectorAll("video");
    for (const video of videos) {
        if (!video.paused && video.duration > 0) {
            return video;
        }
    }

    // Fallback: any video sourced from Google's video CDN
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
