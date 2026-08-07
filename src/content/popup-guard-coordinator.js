// Popup & Click-Hijack Guard Coordinator - ISOLATED world (has chrome.* APIs)
// Feeds settings to the MAIN-world guard and reports back what it blocks.
(function () {
    "use strict";

    const hostname = window.location.hostname;

    function isWhitelisted(whitelistedDomains) {
        if (!Array.isArray(whitelistedDomains)) return false;
        return whitelistedDomains.some(
            (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
        );
    }

    function sendSettingsToMain(adsBlockerSettings) {
        const whitelistedDomains = adsBlockerSettings?.whitelistedDomains || [];

        window.postMessage(
            {
                origin: "bgp-popup-guard-extension",
                action: "settings",
                enabled:
                    adsBlockerSettings?.enabled !== false &&
                    adsBlockerSettings?.blockPopups !== false,
                allowedHost: isWhitelisted(whitelistedDomains),
            },
            "*",
        );
    }

    async function loadSettings() {
        try {
            const local = await chrome.storage.local.get([
                "adsBlockerSettings",
            ]);
            if (local.adsBlockerSettings) {
                sendSettingsToMain(local.adsBlockerSettings);
                return;
            }

            const sync = await chrome.storage.sync.get([
                "consolidatedSettings",
            ]);
            if (sync.consolidatedSettings?.adsBlocker) {
                sendSettingsToMain(sync.consolidatedSettings.adsBlocker);
                return;
            }

            sendSettingsToMain({ enabled: true, blockPopups: true });
        } catch (error) {
            console.debug(
                "[Popup Guard] Failed to load settings, defaulting to enabled:",
                error?.message,
            );
            sendSettingsToMain({ enabled: true, blockPopups: true });
        }
    }

    function showToast(message) {
        try {
            document.getElementById("bgp-popup-guard-toast")?.remove();

            const toast = document.createElement("div");
            toast.id = "bgp-popup-guard-toast";
            toast.textContent = message;
            toast.style.cssText =
                "position:fixed;bottom:16px;right:16px;z-index:2147483647;" +
                "background:#1f2937;color:#fff;padding:10px 14px;border-radius:8px;" +
                "font:13px/1.4 -apple-system,Segoe UI,Arial,sans-serif;" +
                "box-shadow:0 4px 12px rgba(0,0,0,.3);opacity:0;" +
                "transition:opacity .2s ease;pointer-events:none;";

            (document.body || document.documentElement).appendChild(toast);
            requestAnimationFrame(() => {
                toast.style.opacity = "1";
            });
            setTimeout(() => {
                toast.style.opacity = "0";
                setTimeout(() => toast.remove(), 300);
            }, 2500);
        } catch (error) {
            // No document.body yet or page tore down mid-navigation - ignore
        }
    }

    window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.origin !== "bgp-popup-guard-main") return;

        if (data.action === "ready") {
            loadSettings();
            return;
        }

        if (data.action === "blocked") {
            console.log("[Popup Guard] Blocked pop-up to:", data.url);
            showToast("BrowserGuard Pro blocked a pop-up ad");
            try {
                chrome.runtime
                    .sendMessage({
                        action: "popup-guard-blocked",
                        url: data.url,
                    })
                    .catch(() => {});
            } catch (error) {
                // Extension context invalidated (e.g. mid-update) - ignore
            }
        }

        if (data.action === "overlay-neutralized") {
            console.log("[Popup Guard] Neutralized a click-hijack overlay");
        }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (
            (areaName === "local" && changes.adsBlockerSettings) ||
            (areaName === "sync" && changes.consolidatedSettings)
        ) {
            loadSettings();
        }
    });

    // Don't wait for the MAIN-world "ready" ping in case it's ever delayed -
    // send settings immediately too so the enabled-by-default window is short.
    loadSettings();
})();
