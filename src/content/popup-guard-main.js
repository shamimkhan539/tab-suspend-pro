// Popup & Click-Hijack Guard - runs in MAIN world (page's own JS context)
// so it can override window.open before the page's own scripts call it.
(function () {
    "use strict";

    if (window.__bgpPopupGuardInstalled) return;
    window.__bgpPopupGuardInstalled = true;

    // Enabled by default until the isolated-world coordinator delivers the
    // real settings - popunder scripts fire on the very first click, so
    // waiting for an async chrome.storage read first would let one slip through.
    const state = {
        enabled: true,
        allowedHost: false,
    };

    const nativeOpen = window.open;

    function isSameOrigin(url) {
        try {
            return new URL(url, location.href).origin === location.origin;
        } catch (error) {
            return true; // relative/unparsable target - treat as safe
        }
    }

    function hasUserActivation() {
        // Popunders fire window.open() async or with a stale/no gesture.
        // A real click handler (e.g. a "Check activity" button) has live
        // transient activation at the moment it calls window.open().
        return !!(navigator.userActivation && navigator.userActivation.isActive);
    }

    window.open = function (url, target, features) {
        if (
            !state.enabled ||
            state.allowedHost ||
            !url ||
            isSameOrigin(url) ||
            hasUserActivation()
        ) {
            return nativeOpen.call(window, url, target, features);
        }

        window.postMessage(
            {
                origin: "bgp-popup-guard-main",
                action: "blocked",
                url: String(url),
            },
            "*",
        );
        return null;
    };

    // Zone-loader killer.
    //
    // Monetag/PropellerAds-style popunder scripts get injected as:
    //   (function(s){s.dataset.zone='<id>',s.src='https://<rotating-host>/tag.min.js'})
    //     (document.documentElement.appendChild(document.createElement('script')))
    // The host rotates constantly specifically to dodge static domain
    // blocklists, but the `data-zone` attribute on a dynamically-created
    // <script> is the network's own fingerprint and doesn't change. Removing
    // the node the instant it's inserted cancels its pending network fetch
    // before the popunder payload ever loads/runs - no domain list needed.
    function killZoneScript(node) {
        if (
            node &&
            node.tagName === "SCRIPT" &&
            node.dataset &&
            node.dataset.zone
        ) {
            const src = node.src || `zone:${node.dataset.zone}`;
            node.remove();
            window.postMessage(
                { origin: "bgp-popup-guard-main", action: "blocked", url: src },
                "*",
            );
            return true;
        }
        return false;
    }

    function watchForZoneScripts(root) {
        if (!root) return false;

        new MutationObserver((mutations) => {
            if (!state.enabled || state.allowedHost) return;
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(killZoneScript);
            }
        }).observe(root, { childList: true, subtree: true });

        return true;
    }

    if (!watchForZoneScripts(document.documentElement)) {
        // documentElement isn't parsed yet on some edge cases - retry once
        // it exists rather than missing the window entirely.
        const rootWaiter = new MutationObserver(() => {
            if (watchForZoneScripts(document.documentElement)) {
                rootWaiter.disconnect();
            }
        });
        rootWaiter.observe(document, { childList: true });
    }

    // Click-hijack overlay neutralizer.
    //
    // Many "popunder" ad scripts place an invisible, full-viewport layer on
    // top of the real page content; any click on it triggers window.open()
    // (blocked above) and swallows the click so the real element underneath
    // never receives it. Registering this listener on `document` in the
    // capture phase means it always runs before the overlay's own bubble
    // phase handler fires - capture always travels top-down first,
    // regardless of script load order - so we can strip the overlay's
    // pointer-events before its handler executes.
    const NEUTRALIZED_ATTR = "data-bgp-neutralized";

    function isLikelyOverlay(el) {
        if (
            !el ||
            el.nodeType !== 1 ||
            el === document.body ||
            el === document.documentElement
        ) {
            return false;
        }

        const style = window.getComputedStyle(el);
        if (style.position !== "fixed" && style.position !== "absolute") {
            return false;
        }

        const rect = el.getBoundingClientRect();
        const coversViewport =
            rect.width >= window.innerWidth * 0.8 &&
            rect.height >= window.innerHeight * 0.5;
        if (!coversViewport) return false;

        // Real modals/menus/lightboxes almost always contain their own
        // visible text or controls. A click-hijack layer is a bare hit
        // target with nothing of its own sitting on top of real content.
        const hasOwnText = (el.textContent || "").trim().length > 0;
        const hasControls = el.querySelector(
            "button, input, select, textarea, a[href]:not([href='#'])",
        );
        if (hasOwnText || hasControls) return false;

        return (parseInt(style.zIndex, 10) || 0) > 0;
    }

    function nearestAnchor(el) {
        let node = el;
        let depth = 0;
        while (node && depth < 8) {
            if (node.tagName === "A" && node.href) return node;
            node = node.parentElement;
            depth++;
        }
        return null;
    }

    function reportBlocked(url) {
        window.postMessage(
            { origin: "bgp-popup-guard-main", action: "blocked", url },
            "*",
        );
    }

    function handleHijackClick(event) {
        if (!state.enabled || state.allowedHost) return;

        // Vector 1: a script builds an <a target="_blank"> pointing at an ad
        // redirector and fires it with el.click()/dispatchEvent() instead of
        // window.open() - which our override above never sees. A synthetic
        // click with no live user gesture behind it is popunder behavior.
        // But some sites (Gmail's link-tracking relay, e.g.) intercept the
        // real trusted click, log it, then re-dispatch the same anchor click
        // synthetically to actually navigate - that's still a live user
        // gesture, just relayed, so gate on user activation rather than
        // isTrusted alone.
        const anchor = nearestAnchor(event.target);
        if (anchor && !event.isTrusted && !hasUserActivation()) {
            const opensNewTab =
                anchor.target === "_blank" || anchor.target === "_new";
            if (opensNewTab && !isSameOrigin(anchor.href)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                reportBlocked(anchor.href);
                return;
            }
        }

        // Vector 2: an invisible full-viewport hit layer stacked over the
        // real content. Neutralize it for next time AND cancel this click's
        // default action now, otherwise the overlay's own link/navigation
        // still fires before the pointer-events change takes effect.
        let el = event.target;
        let depth = 0;
        while (el && depth < 6) {
            if (el.hasAttribute && el.hasAttribute(NEUTRALIZED_ATTR)) break;

            if (isLikelyOverlay(el)) {
                el.setAttribute(NEUTRALIZED_ATTR, "1");
                el.style.setProperty("pointer-events", "none", "important");
                event.preventDefault();
                event.stopImmediatePropagation();
                window.postMessage(
                    {
                        origin: "bgp-popup-guard-main",
                        action: "overlay-neutralized",
                    },
                    "*",
                );
                break;
            }

            el = el.parentElement;
            depth++;
        }
    }

    document.addEventListener("click", handleHijackClick, true);
    document.addEventListener("auxclick", handleHijackClick, true);

    window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.origin !== "bgp-popup-guard-extension") return;
        if (data.action !== "settings") return;

        state.enabled = data.enabled !== false;
        state.allowedHost = !!data.allowedHost;
    });

    window.postMessage({ origin: "bgp-popup-guard-main", action: "ready" }, "*");
})();
