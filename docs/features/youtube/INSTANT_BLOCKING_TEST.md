# YouTube Music Instant Ad Blocking - Test Guide

## What Changed

**Goal**: Block ads BEFORE they display (0ms visible playback), matching JAdSkip behavior.

### Key Changes

1. **`youtube-blocker-ytm-main.js`**:

    - Renamed `tryClickSkipButton()` → `blockAdsInstantly()`
    - **Removed**: 1000ms delay before seeking
    - **Added**: Instant `player.onAdUxClicked()` trigger
    - **Added**: Validation - only seek short (<60s) googlevideo.com videos

2. **`youtube-blocker-coordinator.js`**:
    - **Changed**: First ad check is instant (0ms delay)
    - **Changed**: First retry at 50ms (instead of 500ms)
    - Subsequent retries remain at 500ms intervals

### Blocking Flow

```
Video Loads
    ↓
Video source changes OR play event fires
    ↓
checkAdPresence(0) - INSTANT (0ms)
    ↓
postMessage("checkAds") to MAIN world
    ↓
blockAdsInstantly() - INSTANT
    ↓
- Triggers player.onAdUxClicked() for all ad slots
- Backup: Seeks only short googlevideo.com videos
    ↓
First Retry: 50ms later
    ↓
Subsequent Retries: 500ms intervals
```

## Testing Steps

### 1. Reload Extension

```
1. Open chrome://extensions/
2. Find "BrowserGuard Pro"
3. Click "Reload" (circular arrow icon)
```

### 2. Open DevTools Console

```
1. Go to YouTube Music (music.youtube.com)
2. Press F12 to open DevTools
3. Go to Console tab
4. Make sure console context shows "top" (not the extension)
```

### 3. Hard Refresh Page

```
Press: Ctrl + Shift + R
(Clears cache and reloads)
```

### 4. Test Ad Blocking

**Test Songs with Known Ads**:

1. Search for popular songs (more likely to have ads)
2. Play from search results
3. Let video start loading

**What to Watch For**:

-   ✅ **SUCCESS**: Song starts playing immediately, no visible ads
-   ✅ **SUCCESS**: Console shows: `[YTM Main] Blocked ad trigger via onAdUxClicked()`
-   ❌ **FAILURE**: Black screen with ad countdown (0.6s, 5s, etc.)
-   ❌ **FAILURE**: "Video will play after ad" message

### 5. Check Console Logs

**Expected Logs** (success):

```
[YouTube Blocker Coordinator] Initialized
[YTM Main] YouTube Music ad blocker loaded (MAIN world)
[YouTube Blocker] Video source changed
[YTM Main] Blocked ad trigger via onAdUxClicked()
```

**Problem Logs** (if ads still show):

```
[YTM Main] Processing YTM ad at 0.5 / 5.3
[YTM Main] Seeking ad video to end
```

### 6. Test Content Videos Don't Skip

**Verify Normal Playback**:

1. Play several songs in a row
2. Songs should play from 0:00 to end
3. No auto-advance to next song mid-playback

**Expected**: Only songs with ads get blocked, content plays normally

## Results

### ✅ Working Correctly

-   Songs play immediately
-   No ad countdown visible
-   Console shows "Blocked ad trigger"
-   Content plays from start to finish

### ⚠️ Needs Adjustment

**If ads flash briefly (<100ms)**:

-   Reduce first retry from 50ms to 0ms (instant double-check)

**If content videos skip**:

-   Duration check may be too generous
-   Need to verify player.adSlots more carefully

**If ads show for 500ms+**:

-   Player.onAdUxClicked() not working
-   May need additional YouTube API calls

## Debugging

Enable verbose logging:

```javascript
// In youtube-blocker-ytm-main.js, add at top of blockAdsInstantly():
console.log("[YTM Main] blockAdsInstantly called");
console.log("[YTM Main] Player slots:", player.getPlayerResponse()?.adSlots);
console.log("[YTM Main] Video duration:", videoPlayer.duration);
console.log("[YTM Main] Video src:", src);
```

## Comparison to JAdSkip

| Feature             | JAdSkip                 | Our Implementation        |
| ------------------- | ----------------------- | ------------------------- |
| Ad Detection        | Instant (on page load)  | Instant (0ms)             |
| Skip Method         | player.onAdUxClicked()  | ✅ Same                   |
| Backup Method       | Video seek              | ✅ Same (with validation) |
| Content Protection  | Duration + source check | ✅ Same                   |
| First Retry         | Unknown                 | 50ms                      |
| Visible Ad Duration | 0ms                     | **Target: 0ms**           |

## Next Steps

1. **Test now** with the steps above
2. **Report back**:

    - Are ads visible at all?
    - Do content videos play normally?
    - Any console errors?

3. **If issues persist**:
    - Share console logs
    - Note exact timing (how long ads show)
    - Try different songs/playlists
