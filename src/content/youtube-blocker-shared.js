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

const isElementVisible = (element) => {
    if (!element) return false;

    if (typeof element.checkVisibility === "function") {
        return element.checkVisibility();
    }

    const style = window.getComputedStyle(element);
    return (
        !!style &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0
    );
};

// Check if ad module has ads
const hasAds = (adsModule) => {
    if (!adsModule || !adsModule[0]) return false;
    return (
        adsModule[0].childElementCount > 0 ||
        !!adsModule[0].querySelector(
            ".ytp-ad-text, .ytp-ad-player-overlay, .ytp-ad-preview-container, .ytp-ad-skip-button-container",
        )
    );
};

const findActiveVideo = (videos) => {
    const asArray = Array.from(videos || []);

    const playingVideo = asArray.find(
        (video) =>
            !video.paused &&
            isFinite(video.duration) &&
            video.duration > 0 &&
            isElementVisible(video),
    );

    if (playingVideo) return playingVideo;

    return (
        asArray.find(
            (video) =>
                isFinite(video.duration) &&
                video.duration > 0 &&
                isElementVisible(video),
        ) ||
        asArray[0] ||
        null
    );
};

const hasAnyAdDomIndicator = () => {
    const selectors = [
        "#movie_player.ad-showing",
        "#movie_player.ad-interrupting",
        ".ytp-ad-module:not(:empty)",
        ".ytp-ad-player-overlay",
        ".ytp-ad-text",
        ".ytp-ad-preview-container",
        ".ytp-ad-skip-button-container",
        ".ytp-ad-skip-button",
        ".ytp-ad-skip-button-modern",
        ".ytp-skip-ad-button",
        ".ytp-ad-simple-ad-badge",
        ".video-ads",
        "ytmusic-mealbar-promo-renderer",
        "ytmusic-display-ad-renderer",
        '[class*="ad-showing"]',
        '[class*="ad-playing"]',
    ];

    return selectors.some((selector) => {
        const nodes = document.querySelectorAll(selector);
        return Array.from(nodes).some((node) => isElementVisible(node));
    });
};

const clickVisibleSkipButton = () => {
    const selectors = [
        ".ytp-ad-skip-button",
        ".ytp-ad-skip-button-modern",
        ".ytp-skip-ad-button",
        ".ytp-ad-skip-button-container button",
    ];

    for (const selector of selectors) {
        const buttons = document.querySelectorAll(selector);
        for (const button of buttons) {
            if (!isElementVisible(button)) continue;

            button.click();
            logMessage(`Clicked visible skip button (${selector})`);
            return true;
        }
    }

    return false;
};

const hideSponsoredBlocks = () => {
    let hiddenCount = 0;

    const wrapperSelector =
        "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-rich-grid-media, ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer";

    const hideElement = (element, reason) => {
        if (!element) return false;

        const wrapper = element.closest(wrapperSelector);
        const target = wrapper || element;

        if (target.dataset.ytblockerSponsoredHidden === "1") return false;

        element.dataset.ytblockerSponsoredHidden = "1";
        element.style.setProperty("display", "none", "important");

        if (target !== element) {
            target.dataset.ytblockerSponsoredHidden = "1";
            target.style.setProperty("display", "none", "important");
        }

        if (reason) {
            target.dataset.ytblockerSponsoredReason = reason;
        }

        return true;
    };

    const directSelectors = [
        "ytd-display-ad-renderer",
        "ytd-ad-slot-renderer",
        "ytd-in-feed-ad-layout-renderer",
        "ytd-promoted-video-renderer",
        "ytd-compact-promoted-video-renderer",
        "ytd-promoted-sparkles-web-renderer",
        "ytd-player-legacy-desktop-watch-ads-renderer",
        "ytmusic-display-ad-renderer",
        "ytmusic-promoted-sparkles-web-renderer",
        "ytmusic-mealbar-promo-renderer",
    ];

    directSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
            if (hideElement(element, selector)) {
                hiddenCount += 1;
            }
        });
    });

    const sponsoredLabelRegex = /\b(sponsored|promoted)\b/i;
    const labelCandidates = document.querySelectorAll(
        "ytd-badge-supported-renderer, #metadata-line span, .ytp-ad-text, [aria-label*='Sponsored'], [aria-label*='sponsored'], [aria-label*='Promoted'], [aria-label*='promoted']",
    );

    labelCandidates.forEach((candidate) => {
        const labelText =
            candidate.getAttribute("aria-label") || candidate.textContent || "";

        if (!sponsoredLabelRegex.test(labelText)) {
            return;
        }

        const sponsoredCard = candidate.closest(
            "ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer, ytd-rich-grid-media, ytd-promoted-video-renderer, ytd-compact-promoted-video-renderer, ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer",
        );

        if (hideElement(sponsoredCard, "label-match")) {
            hiddenCount += 1;
        }
    });

    if (hiddenCount > 0) {
        logMessage(`[Sponsored] Hidden ${hiddenCount} sponsored block(s)`);
    }

    return hiddenCount;
};

const hasVisibleAdIndicator = (moviePlayer) => {
    if (!moviePlayer) return false;

    if (
        moviePlayer.classList.contains("ad-showing") ||
        moviePlayer.classList.contains("ad-interrupting")
    ) {
        return true;
    }

    const adSelectors = [
        ".ytp-ad-module:not(:empty)",
        ".ytp-ad-player-overlay",
        ".ytp-ad-text",
        ".ytp-ad-preview-container",
        ".ytp-ad-skip-button-container",
        ".ytp-skip-ad-button",
        ".video-ads",
        ".ad-container",
    ];

    return adSelectors.some((selector) => {
        const element = moviePlayer.querySelector(selector);
        return isElementVisible(element);
    });
};

// Get the ad player element (YouTube specific)
const getAdPlayerYT = () => {
    const moviePlayer = document.getElementById("movie_player");
    if (!moviePlayer) {
        return null;
    }

    const videoStream = moviePlayer.getElementsByClassName("video-stream");
    const adsModule = moviePlayer.getElementsByClassName("ytp-ad-module");

    if (!videoStream.length) {
        return null;
    }

    const hasAdModule = adsModule.length && hasAds(adsModule);
    const hasAdIndicator = hasVisibleAdIndicator(moviePlayer);

    if (hasAdModule || hasAdIndicator) {
        return findActiveVideo(videoStream);
    }

    return null;
};

// Get the ad player element (YouTube Music specific).
// IMPORTANT: Only return a video element when ad UI is actually visible in the DOM.
// Without this guard, the function returns the currently-playing song and
// trySkipAd() seeks it to its end — causing songs to skip after 1-2 seconds.
const getAdPlayerYTM = () => {
    // Only treat as ad playback when a visible ad indicator is present.
    const hasActiveAdUI = hasAnyAdDomIndicator();

    if (!hasActiveAdUI) return null;

    // Ad is confirmed visible — return the playing video element
    const videos = document.querySelectorAll("video");
    return findActiveVideo(videos);
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
