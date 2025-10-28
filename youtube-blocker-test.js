// YouTube Ads Blocker - Quick Test Console Script
// Run this in DevTools Console (F12) on a YouTube page to verify ads blocker is working

(function () {
    console.log("=== YouTube Ads Blocker Test Suite ===\n");

    // Test 1: Check if youtube-blocker script is active
    console.log("TEST 1: YouTube Blocker Script Activation");
    if (window.__youtubeBlockerActive) {
        console.log("✅ YouTube Blocker script is running");
    } else {
        console.log("❌ YouTube Blocker script may not be loaded");
        console.log(
            "   Try: Reload page (F5) or reload extension (Ctrl+Shift+R)"
        );
    }

    // Test 2: Check if settings were loaded
    console.log("\nTEST 2: Settings Load Status");
    chrome.runtime.sendMessage(
        { action: "get-youtube-blocker-settings" },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error(
                    "❌ Error getting settings:",
                    chrome.runtime.lastError
                );
            } else if (response) {
                console.log("✅ Settings received from background:");
                console.log(
                    "   - Block YouTube Ads: " +
                        (response.blockYoutubeAds
                            ? "✅ ENABLED"
                            : "❌ DISABLED")
                );
                console.log(
                    "   - Block YouTube Music Ads: " +
                        (response.blockYoutubeMusicAds
                            ? "✅ ENABLED"
                            : "❌ DISABLED")
                );
                if (response.blockYoutubeAds) {
                    console.log(
                        "\n   ✅ YouTube ads should be blocked on this page"
                    );
                } else {
                    console.log("\n   ℹ️  YouTube ads blocking is disabled");
                    console.log(
                        "   To enable: Open Advanced Options → Ads Blocker tab → Enable 'Block YouTube Ads'"
                    );
                }
            } else {
                console.error("❌ No response from background script");
            }
        }
    );

    // Test 3: Check for ad player
    console.log("\nTEST 3: Ad Player Detection");
    const adPlayer = document.querySelector(".html5-main-video");
    if (adPlayer) {
        console.log("✅ Ad player element found (.html5-main-video)");
        console.log("   Duration: " + adPlayer.duration + "s");
        console.log("   Current: " + adPlayer.currentTime + "s");
    } else {
        console.log(
            "ℹ️  Ad player not currently visible (may appear when ads play)"
        );
    }

    // Test 4: Check for skip button
    console.log("\nTEST 4: Skip Button Detection");
    const skipBtn = document.querySelector("button.ytp-ad-skip-button");
    if (skipBtn) {
        console.log("✅ Skip button found and visible");
        console.log(
            "   Click handler status:",
            skipBtn.onclick ? "Has handler" : "No handler"
        );
    } else {
        console.log(
            "ℹ️  Skip button not currently visible (appears when ad is skippable)"
        );
    }

    // Test 5: Check storage
    console.log("\nTEST 5: Storage Status");
    chrome.storage.local.get(["adsBlockerSettings"], (result) => {
        if (result.adsBlockerSettings) {
            console.log("✅ Ads blocker settings in LOCAL storage:");
            console.log(
                "   ",
                JSON.stringify(result.adsBlockerSettings, null, 2)
            );
        } else {
            console.log("⚠️  No ads blocker settings in LOCAL storage");
            console.log("   Checking SYNC storage...");
            chrome.storage.sync.get(["consolidatedSettings"], (syncResult) => {
                if (syncResult.consolidatedSettings?.adsBlocker) {
                    console.log(
                        "✅ Found in SYNC storage (consolidatedSettings.adsBlocker):"
                    );
                    console.log(
                        "   ",
                        JSON.stringify(
                            syncResult.consolidatedSettings.adsBlocker,
                            null,
                            2
                        )
                    );
                } else {
                    console.log(
                        "❌ No ads blocker settings found in SYNC storage either"
                    );
                }
            });
        }
    });

    // Test 6: Simulate ad skip
    console.log("\nTEST 6: Manual Ad Skip Test");
    console.log("To manually test ad skipping:");
    console.log("1. Play a YouTube video");
    console.log(
        "2. Wait for an ad to appear (may see 'Skip in 5 seconds' message)"
    );
    console.log("3. If blocker is working:");
    console.log("   - Ad should auto-skip when skip button appears");
    console.log(
        "   - You should see logs: '[YouTube Blocker] Clicked skip button'"
    );

    console.log("\n=== Test Complete ===");
    console.log(
        "\nFor detailed logs, search console for '[YouTube Blocker]' messages"
    );
    console.log(
        "If issues persist, see: YOUTUBE_ADS_BLOCKER_FIX.md for debugging guide"
    );
})();
