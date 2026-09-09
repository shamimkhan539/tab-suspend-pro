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

// How long an ad must have played before we seek past it. Long enough for
// YouTube to register the impression as "started" (seeking at t=0 is a
// detection trip wire), short enough that the user is not made to sit through
// a proportional slice of every ad. The old rule was `duration * 0.4`, which
// meant 6s of a 15s ad and 12s of a 30s one.
const YTBLOCKER_AD_START_REGISTER_SECONDS = 1.5;

// Returns the currentTime an ad must reach before trySkipAd() may seek.
const getAdSkipThreshold = (duration) => {
    if (!isFinite(duration) || duration <= 0) {
        return YTBLOCKER_AD_START_REGISTER_SECONDS;
    }

    // Never wait past the midpoint — guards very short bumper ads.
    return Math.min(YTBLOCKER_AD_START_REGISTER_SECONDS, duration * 0.5);
};

// Make a wrapper report itself as native code. YouTube's integrity checks read
// Function.prototype.toString on fetch/XHR; an obvious wrapper body is a
// tamper signature.
const maskNativeWrapper = (wrapper, original) => {
    try {
        Object.defineProperty(wrapper, "name", {
            value: original.name,
            configurable: true,
        });
        Object.defineProperty(wrapper, "toString", {
            value: () => Function.prototype.toString.call(original),
            writable: true,
            configurable: true,
        });
    } catch (error) {
        // Non-configurable in some engines - not fatal.
    }
};

// Endpoints that carry adSlots / adPlacements in their payload.
const YTBLOCKER_AD_API_PATH_REGEX =
    /\/youtubei\/v1\/(player|next|reel\/reel_item_watch|browse)/;

let ytblockerInterceptorInstalled = false;

// Observe YouTube's player API responses so ad-slot metadata can be captured
// for the skip-button API (clickTriggers). Strictly read-only: the response is
// never reassigned or reserialized - rewriting a parsed payload is a strong
// tamper signature for YouTube's ad-block/integrity detection.
//
// Both fetch() and XMLHttpRequest are hooked. fetch() is the important one:
// YouTube issues /youtubei/v1/player through fetch, so the previous XHR-only
// hook meant adSlots stayed empty and the API skip path never ran.
const installAdPayloadInterceptor = (onPayload) => {
    if (ytblockerInterceptorInstalled) return;
    ytblockerInterceptorInstalled = true;

    const deliver = (payload, url) => {
        if (!payload || typeof payload !== "object") return;

        try {
            onPayload(payload, url);
        } catch (error) {
            logMessage(
                `Ad payload handler failed: ${error.message || error}`,
            );
        }
    };

    const deliverText = (text, url) => {
        if (!text || typeof text !== "string") return;

        try {
            deliver(JSON.parse(text), url);
        } catch (error) {
            // Not a JSON body - ignore.
        }
    };

    // --- XMLHttpRequest ---
    // open() is hooked only to remember the URL for logging. The load handler
    // uses addEventListener rather than wrapping the `onload` property:
    // YouTube attaches its handlers with addEventListener, so a wrapper that
    // only fires when `this.onload` is already set never runs.
    const originalOpen = XMLHttpRequest.prototype.open;
    const patchedOpen = function (method, url, ...rest) {
        this.ytblockerRequestUrl = url;
        return originalOpen.call(this, method, url, ...rest);
    };
    maskNativeWrapper(patchedOpen, originalOpen);
    XMLHttpRequest.prototype.open = patchedOpen;

    const originalSend = XMLHttpRequest.prototype.send;
    const patchedSend = function (...args) {
        if (!this.ytblockerLoadHooked) {
            this.ytblockerLoadHooked = true;

            this.addEventListener("load", () => {
                try {
                    const responseType = this.responseType;

                    if (responseType === "" || responseType === "text") {
                        deliverText(this.responseText, this.ytblockerRequestUrl);
                    } else if (responseType === "json") {
                        deliver(this.response, this.ytblockerRequestUrl);
                    }
                } catch (error) {
                    // Body not readable for this responseType - ignore.
                }
            });
        }

        return originalSend.apply(this, args);
    };
    maskNativeWrapper(patchedSend, originalSend);
    XMLHttpRequest.prototype.send = patchedSend;

    // --- fetch ---
    const originalFetch = window.fetch;

    if (typeof originalFetch === "function") {
        const patchedFetch = function (...args) {
            const input = args[0];
            const url =
                typeof input === "string"
                    ? input
                    : input && input.url
                      ? input.url
                      : String(input || "");

            const responsePromise = originalFetch.apply(this, args);

            if (!YTBLOCKER_AD_API_PATH_REGEX.test(url)) {
                return responsePromise;
            }

            return responsePromise.then((response) => {
                // clone() so the page still receives an unread, untouched body.
                try {
                    response
                        .clone()
                        .text()
                        .then((text) => deliverText(text, url))
                        .catch(() => {});
                } catch (error) {
                    // Body already disturbed or not cloneable - ignore.
                }

                return response;
            });
        };

        maskNativeWrapper(patchedFetch, originalFetch);
        window.fetch = patchedFetch;
    }

    logMessage("Ad payload interceptor installed (fetch + XHR)");
};

const YTBLOCKER_HIDE_STYLE_ID = "ytblocker-sponsored-hide-style";

const ensureSponsoredHideStyle = () => {
    if (document.getElementById(YTBLOCKER_HIDE_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = YTBLOCKER_HIDE_STYLE_ID;
    // #player-ads is intentionally excluded. YouTube's anti-adblock check
    // inspects that container's visibility/emptiness to detect blockers, so
    // force-hiding it is a direct detection trip wire. The bare tag selectors
    // below (ytd-display-ad-renderer, ytd-ad-slot-renderer) can also render
    // *inside* #player-ads, so every one of them needs the :not(#player-ads *)
    // guard — an unscoped selector defeats the exclusion above.
    style.textContent = `
        ytd-display-ad-renderer:not(#player-ads *),
        ytd-ad-slot-renderer:not(#player-ads *),
        ytd-in-feed-ad-layout-renderer:not(#player-ads *),
        ytd-promoted-video-renderer:not(#player-ads *),
        ytd-compact-promoted-video-renderer:not(#player-ads *),
        ytd-promoted-sparkles-web-renderer:not(#player-ads *),
        ytd-promoted-sparkles-text-search-renderer:not(#player-ads *),
        ytd-companion-slot-renderer:not(#player-ads *),
        ytd-action-companion-ad-renderer:not(#player-ads *),
        ytd-player-legacy-desktop-watch-ads-renderer:not(#player-ads *),
        ytd-video-masthead-ad-v3-renderer:not(#player-ads *),
        ytd-banner-promo-renderer:not(#player-ads *),
        ytmusic-display-ad-renderer:not(#player-ads *),
        ytmusic-promoted-sparkles-web-renderer:not(#player-ads *),
        ytmusic-mealbar-promo-renderer:not(#player-ads *),
        #panels ytd-ads-engagement-panel-content-renderer,
        #related ytd-display-ad-renderer,
        #secondary ytd-display-ad-renderer,
        #secondary ytd-ad-slot-renderer {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            max-height: 0 !important;
            min-height: 0 !important;
            overflow: hidden !important;
        }
    `;

    (document.head || document.documentElement).appendChild(style);
};

const removeSponsoredHideStyle = () => {
    document.getElementById(YTBLOCKER_HIDE_STYLE_ID)?.remove();
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

        // #player-ads is a known anti-adblock trip wire (see
        // ensureSponsoredHideStyle) — never hide anything inside it, even
        // when it matches one of the tag-name selectors below.
        if (element.closest("#player-ads")) return false;

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
        "ytd-promoted-sparkles-text-search-renderer",
        "ytd-companion-slot-renderer",
        "ytd-action-companion-ad-renderer",
        "ytd-player-legacy-desktop-watch-ads-renderer",
        "ytd-video-masthead-ad-v3-renderer",
        "ytd-banner-promo-renderer",
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

    const contentCards = document.querySelectorAll(
        "#secondary ytd-compact-video-renderer, #related ytd-compact-video-renderer, ytd-video-renderer, ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-rich-grid-media, ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer",
    );

    contentCards.forEach((card) => {
        if (card.dataset.ytblockerSponsoredHidden === "1") return;

        const cardText = (card.textContent || "").toLowerCase();
        if (!cardText.includes("sponsored") && !cardText.includes("promoted")) {
            return;
        }

        if (hideElement(card, "card-text-match")) {
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
