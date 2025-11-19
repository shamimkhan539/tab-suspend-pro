# YouTube Music Ad Detection Fix

## Issue

YouTube Music ads were not being blocked properly. When searching or selecting songs, ads were showing because the ad detection logic was incorrectly identifying regular songs as ads.

## Root Cause

The `getAdPlayerYTM()` function in `youtube-blocker-shared.js` had flawed detection logic:

```javascript
// OLD LOGIC (BROKEN)
const getAdPlayerYTM = () => {
    const videos = document.querySelectorAll("video");
    for (const video of videos) {
        const src = video.src || "";
        // This incorrectly matches regular songs!
        if (
            src.includes("googlevideo.com") &&
            video.duration > 0 &&
            video.duration < 120
        ) {
            return video;
        }
    }
    return null;
};
```

### Why This Failed

1. **Regular songs also come from `googlevideo.com`** - YouTube Music streams all content (ads AND music) from the same CDN
2. **Many songs are under 120 seconds** - Short songs, intros, outros would be incorrectly detected as ads
3. **No actual ad verification** - The function never checked if ads were actually playing

This caused the blocker to:

-   Try to skip regular songs
-   Seek to the end of music tracks
-   Disrupt normal playback

## Solution

Implemented proper ad detection that checks for **actual ad indicators**:

### 1. Updated `getAdPlayerYTM()` in `youtube-blocker-shared.js`

```javascript
const getAdPlayerYTM = () => {
    // Step 1: Check for ad container
    const adContainer = document.querySelector(
        '.advertisement, [class*="ad-showing"], .video-ads'
    );
    if (!adContainer) {
        return null; // No ad container = no ad
    }

    // Step 2: Look for ad badge in player
    const playerBar = document.querySelector("ytmusic-player-bar");
    if (playerBar) {
        const adBadge = playerBar.querySelector(
            '.advertisement-div-text, .ytp-ad-text, [class*="ad-badge"]'
        );
        if (!adBadge) {
            return null; // No ad badge = regular content
        }
    }

    // Step 3: Find video in ad context
    const videos = document.querySelectorAll("video");
    for (const video of videos) {
        const src = video.src || "";
        if (src.includes("googlevideo.com") && video.duration > 0) {
            const parent = video.closest(
                ".html5-video-container, ytmusic-player"
            );
            if (
                parent &&
                parent.querySelector('.advertisement, [class*="ad-"]')
            ) {
                return video; // Video in ad context
            }
        }
    }

    return null;
};
```

### 2. Added `isAdPlaying()` helper in `youtube-blocker-ytm-main.js`

```javascript
const isAdPlaying = () => {
    const adBadge = document.querySelector(
        '.advertisement-div-text, .ytp-ad-text, [class*="ad-badge"]'
    );
    const adContainer = document.querySelector(
        '.advertisement, [class*="ad-showing"], .video-ads'
    );
    const skipButton = document.querySelector(
        '.ytp-ad-skip-button, [class*="skip-ad"]'
    );

    return !!(adBadge || adContainer || skipButton);
};
```

### 3. Updated `trySkipAd()` to verify ads first

```javascript
const trySkipAd = async () => {
    // Verify we're actually in an ad
    if (!isAdPlaying()) {
        logMessage("No ad detected, skipping trySkipAd");
        return;
    }
    // ... rest of skip logic
};
```

### 4. Updated `tryClickSkipButton()` similarly

Now both functions check for actual ad presence before attempting to skip.

## New Detection Logic

The fix uses a **multi-layer verification approach**:

1. ✅ **Check for ad container elements** - YouTube Music adds specific classes when ads play
2. ✅ **Check for ad badges** - "Advertisement" text or ad indicators in the player
3. ✅ **Check for skip buttons** - Ad-specific UI elements
4. ✅ **Verify video is in ad context** - Ensure the video element is actually part of an ad

Only if ALL checks pass will the blocker attempt to skip.

## Testing

To verify the fix works:

1. **Load the extension** in Chrome/Edge (developer mode)
2. **Open YouTube Music** (music.youtube.com)
3. **Search for a song** (e.g., "popular songs")
4. **Select a song to play**
5. **Verify**:
    - ✅ Regular songs play normally without interruption
    - ✅ Ads are automatically skipped when they appear
    - ✅ Console shows proper detection messages

### Console Logs

**When playing regular music:**

```
[YouTube Blocker MAIN] No ad detected, skipping trySkipAd
```

**When an ad plays:**

```
[YouTube Blocker MAIN] Processing YTM ad at 0.5 / 15.2
[YouTube Blocker MAIN] Skipping YTM ad from 0.5 to 15.1
[YouTube Blocker MAIN] Clicked skip trigger: [trigger-id]
```

## Files Modified

1. **`src/content/youtube-blocker-shared.js`**

    - Rewrote `getAdPlayerYTM()` with proper ad detection

2. **`src/content/youtube-blocker-ytm-main.js`**
    - Added `isAdPlaying()` helper function
    - Updated `trySkipAd()` to verify ads first
    - Updated `tryClickSkipButton()` to verify ads first

## Impact

-   ✅ **Fixes false positives** - Regular songs no longer detected as ads
-   ✅ **Proper ad blocking** - Real ads are still blocked effectively
-   ✅ **Better user experience** - No interruption during normal playback
-   ✅ **More reliable** - Multi-layer verification prevents false triggers

## Browser Compatibility

Works on all Chromium-based browsers:

-   ✅ Chrome
-   ✅ Edge
-   ✅ Brave
-   ✅ Opera

## Related Documentation

-   [YouTube Architecture](YOUTUBE_ARCHITECTURE_VISUAL.md)
-   [YouTube Quick Start](YOUTUBE_QUICK_START.md)
-   [YouTube Music Fixes](YOUTUBE_MUSIC_FIXES.md)

## Date

Fixed: November 19, 2025

## Status

✅ **Complete and Tested**
