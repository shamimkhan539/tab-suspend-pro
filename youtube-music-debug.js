// YouTube Music Ad Blocker - DEBUG VERSION
// Run this in the YouTube Music console to diagnose issues

(function () {
    "use strict";

    console.log(
        "%c🔍 YouTube Music Ad Blocker Debug Tool",
        "background: #1DB954; color: white; padding: 5px 10px; font-size: 16px; font-weight: bold;"
    );

    // Test 1: Check if scripts are loaded
    console.log("\n📦 1. Checking script injection...");
    const coordinatorMarker = document.querySelector(
        `[${SKIPPED_TAG_NAME || "ytblocker-listener"}]`
    );
    console.log(
        "   Coordinator script loaded:",
        !!window.ytblockerCoordinator || coordinatorMarker !== null
            ? "✅"
            : "❌"
    );
    console.log(
        "   Main world script loaded:",
        typeof getAdPlayerYTM === "function" ? "✅" : "❌"
    );

    // Test 2: Check settings
    console.log("\n⚙️ 2. Checking settings...");
    chrome.runtime.sendMessage(
        { action: "get-youtube-blocker-settings" },
        function (response) {
            if (chrome.runtime.lastError) {
                console.error(
                    "   ❌ Error loading settings:",
                    chrome.runtime.lastError.message
                );
            } else if (response) {
                console.log("   Settings:", response);
                console.log(
                    "   YouTube Music blocking:",
                    response.blockYoutubeMusicAds ? "✅ Enabled" : "❌ Disabled"
                );
            } else {
                console.log("   ❌ No response from background");
            }
        }
    );

    // Test 3: Check player detection
    console.log("\n🎵 3. Checking player detection...");
    const playerElement = document.getElementById("player");
    console.log(
        "   Player element (#player):",
        playerElement ? "✅ Found" : "❌ Not found"
    );

    if (playerElement) {
        console.log(
            "   Has getPlayer method:",
            typeof playerElement.getPlayer === "function" ? "✅" : "❌"
        );

        if (typeof playerElement.getPlayer === "function") {
            try {
                const player = playerElement.getPlayer();
                console.log(
                    "   Player instance:",
                    player ? "✅ Available" : "❌ Not available"
                );

                if (player) {
                    const playerResponse = player.getPlayerResponse();
                    console.log(
                        "   Player response:",
                        playerResponse ? "✅ Available" : "❌ Not available"
                    );

                    if (playerResponse) {
                        const adSlots = playerResponse.adSlots;
                        console.log(
                            "   Ad slots:",
                            adSlots ? `✅ ${adSlots.length} slots` : "❌ None"
                        );

                        if (adSlots && adSlots.length > 0) {
                            console.log("   Ad slot details:", adSlots[0]);
                        }
                    }
                }
            } catch (err) {
                console.error("   ❌ Error getting player:", err.message);
            }
        }
    }

    // Test 4: Check video elements
    console.log("\n🎬 4. Checking video elements...");
    const videos = document.querySelectorAll("video");
    console.log(`   Found ${videos.length} video element(s)`);

    videos.forEach((video, index) => {
        console.log(`   Video ${index + 1}:`);
        console.log("     - src:", video.src.substring(0, 80) + "...");
        console.log("     - duration:", video.duration.toFixed(2), "seconds");
        console.log(
            "     - currentTime:",
            video.currentTime.toFixed(2),
            "seconds"
        );
        console.log("     - paused:", video.paused);
    });

    // Test 5: Check for ad indicators
    console.log("\n📺 5. Checking ad indicators...");
    const adIndicators = {
        "Ad container (.advertisement)":
            document.querySelector(".advertisement"),
        "Ad showing class": document.querySelector('[class*="ad-showing"]'),
        "Video ads container": document.querySelector(".video-ads"),
        "Ad badge (.advertisement-div-text)": document.querySelector(
            ".advertisement-div-text"
        ),
        "YT ad text (.ytp-ad-text)": document.querySelector(".ytp-ad-text"),
        "Ad badge (generic)": document.querySelector('[class*="ad-badge"]'),
        "Skip button (.ytp-ad-skip-button)": document.querySelector(
            ".ytp-ad-skip-button"
        ),
        "Skip ad button": document.querySelector('[class*="skip-ad"]'),
    };

    Object.entries(adIndicators).forEach(([name, element]) => {
        console.log(`   ${name}:`, element ? "✅ Found" : "❌ Not found");
    });

    // Test 6: Check player bar
    console.log("\n🎮 6. Checking player bar...");
    const playerBar = document.querySelector("ytmusic-player-bar");
    console.log(
        "   Player bar (ytmusic-player-bar):",
        playerBar ? "✅ Found" : "❌ Not found"
    );

    if (playerBar) {
        console.log(
            "   Player bar HTML:",
            playerBar.outerHTML.substring(0, 200) + "..."
        );
    }

    // Test 7: Try manual ad detection
    console.log("\n🎯 7. Running manual ad detection...");

    if (typeof getAdPlayerYTM === "function") {
        const adPlayer = getAdPlayerYTM();
        console.log(
            "   getAdPlayerYTM() result:",
            adPlayer ? "✅ Ad detected" : "❌ No ad detected"
        );

        if (adPlayer) {
            console.log("   Ad video details:");
            console.log("     - src:", adPlayer.src);
            console.log("     - duration:", adPlayer.duration);
            console.log("     - currentTime:", adPlayer.currentTime);
        }
    } else {
        console.log(
            "   ❌ getAdPlayerYTM function not available (MAIN world script not loaded)"
        );
    }

    // Test 8: Listen for messages
    console.log("\n📨 8. Setting up message listener...");
    let messageCount = 0;
    window.addEventListener("message", (event) => {
        if (
            event.data.origin === "ytblocker-extension" ||
            event.data.origin === "ytblocker-main"
        ) {
            messageCount++;
            console.log(`   Message ${messageCount}:`, event.data);
        }
    });
    console.log("   ✅ Listening for messages (check above for any received)");

    // Test 9: Check for errors
    console.log("\n⚠️ 9. Recent console errors:");
    console.log(
        "   (Check console for any YouTube Blocker related errors above)"
    );

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log(
        "%c📊 Debug Summary",
        "background: #1DB954; color: white; padding: 3px 8px; font-weight: bold;"
    );
    console.log("=".repeat(60));
    console.log("If you see ❌ marks above, those are potential issues.");
    console.log("\nCommon issues:");
    console.log("  - Scripts not loaded → Reload extension and refresh page");
    console.log("  - Settings disabled → Check extension options");
    console.log("  - Player not found → Wait for page to fully load");
    console.log("  - No ad indicators → Ads might not be playing right now");
    console.log("\nTo test with an actual ad:");
    console.log("  1. Play a song on YouTube Music");
    console.log("  2. Wait for an ad to appear");
    console.log("  3. Run this script again during the ad");
    console.log("=".repeat(60));
})();
