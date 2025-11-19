# YouTube Music Ad Blocking - Debugging Guide

## 🚨 Problem

YouTube Music ads are still showing after attempting to block them.

## 🔍 Debug Steps

### Step 1: Reload Extension

1. Go to `chrome://extensions/`
2. Find "BrowserGuard Pro"
3. Click the **reload icon** (circular arrow)
4. Close and reopen any YouTube Music tabs

### Step 2: Check Extension Status

1. Click the extension icon
2. Verify it says "Extension: Enabled"
3. Click Settings (⚙️)
4. Go to "Ads Blocker" tab
5. Verify "Block YouTube Music Ads" is checked ✅

###Step 3: Run Debug Script

1. Open YouTube Music (music.youtube.com)
2. Open Chrome DevTools (F12)
3. Go to **Console** tab
4. Copy and paste the debug script from `youtube-music-debug.js`
5. Press Enter

**Look for these indicators:**

```
✅ Coordinator script loaded: ✅
✅ Main world script loaded: ✅
✅ YouTube Music blocking: ✅ Enabled
✅ Player element (#player): ✅ Found
```

### Step 4: Test During an Ad

1. Play a song on YouTube Music
2. Wait for an ad to appear
3. Open Console (F12)
4. Look for these messages:

**Expected console output when ad plays:**

```
[YouTube Blocker MAIN] Processing YTM ad at 0.5 / 15.2
[YouTube Blocker MAIN] Skipping YTM ad from 0.5 to 15.1
[YouTube Blocker MAIN] Clicked skip trigger: [trigger-id]
```

**If you see these, blocking IS working!**

### Step 5: Check for Errors

Look for error messages in the console:

❌ **"Unable to get YouTube Music player"**

-   Solution: Refresh the page, player not loaded yet

❌ **"No ad slots in player response"**

-   Solution: This might not actually be an ad, or YouTube changed their structure

❌ **"Error loading settings"**

-   Solution: Reload extension, check settings are enabled

## 🐛 Common Issues & Fixes

### Issue 1: Scripts Not Loading

**Symptom:** Debug script shows "❌ Coordinator script loaded: ❌"

**Fix:**

```powershell
# In PowerShell terminal:
cd "d:\test\extension\tab-suspend-pro"
# Reload extension at chrome://extensions/
# Hard refresh YouTube Music: Ctrl+Shift+R
```

### Issue 2: Settings Not Saved

**Symptom:** Settings keep reverting to disabled

**Fix:**

1. Open extension options
2. Go to Ads Blocker tab
3. Check "Block YouTube Music Ads"
4. Click "Save Settings" button at bottom
5. Wait for "Settings saved successfully" message

### Issue 3: Player Not Found

**Symptom:** Debug shows "❌ Player element (#player): ❌ Not found"

**Fix:**

-   Wait 2-3 seconds for page to fully load
-   Run debug script again
-   If still not found, YouTube Music page hasn't loaded properly - refresh

### Issue 4: Ad Detection Not Working

**Symptom:** Console shows nothing when ads play

**Fix:**
This means the video listener isn't triggering. Check:

1. Content scripts are injected (see Debug Step 3)
2. Block enabled setting is true
3. Try playing a different song

## 📊 Expected Behavior

### ✅ When Working Correctly:

1. **Before ad starts:**

    - Normal playback
    - No console messages

2. **When ad appears:**

    - Console: `[YouTube Blocker] Video source changed`
    - Console: `[YouTube Blocker MAIN] Processing YTM ad...`
    - Console: `[YouTube Blocker MAIN] Skipping YTM ad...`
    - Ad disappears within 1-2 seconds

3. **After ad:**
    - Music resumes playing
    - No interruption

### ❌ When NOT Working:

1. Ad plays fully (15-30 seconds)
2. No console messages during ad
3. Have to manually skip ad

## 🔧 Advanced Debugging

### Enable Verbose Logging

Add this to console before playing music:

```javascript
// Enable verbose YouTube blocker logging
localStorage.setItem("ytblocker-debug", "true");

// Then reload the page
location.reload();
```

### Check Message Passing

```javascript
// Listen for all messages
window.addEventListener("message", (e) => {
    if (
        e.data.origin === "ytblocker-extension" ||
        e.data.origin === "ytblocker-main"
    ) {
        console.log("YTBlocker Message:", e.data);
    }
});
```

### Manually Trigger Ad Check

```javascript
// Force an ad check
window.postMessage({
    origin: "ytblocker-extension",
    action: "checkAds",
});
```

## 📝 Report Issues

If ads are still showing after all debugging steps, please provide:

1. **Chrome version:** `chrome://version/`
2. **Extension version:** Check `manifest.json` → version field
3. **Console output:** Screenshot or copy/paste
4. **Debug script results:** Copy/paste all output
5. **Steps to reproduce:**
    - What song/playlist you were playing
    - When the ad appeared
    - What happened (or didn't happen)

## 🎯 Quick Checklist

Before reporting issues, verify:

-   [ ] Extension is reloaded
-   [ ] YouTube Music tab is refreshed (Ctrl+Shift+R)
-   [ ] Extension is enabled (click icon, check status)
-   [ ] "Block YouTube Music Ads" setting is checked
-   [ ] Debug script shows scripts are loaded
-   [ ] Debug script shows settings are enabled
-   [ ] Tested with an actual ad (not just regular songs)
-   [ ] Checked console for error messages

## 📞 Next Steps

If everything checks out but ads still show:

1. **Try incognito mode** (disable other extensions)
2. **Check if YouTube changed their ad structure** (they update frequently)
3. **Provide detailed debug output** for investigation

## 🔄 Files to Check

If code changes are needed:

-   `manifest.json` - Content script injection
-   `src/content/youtube-blocker-coordinator.js` - ISOLATED world
-   `src/content/youtube-blocker-ytm-main.js` - MAIN world (YouTube Music)
-   `src/content/youtube-blocker-shared.js` - Shared functions
-   `background.js` - Settings handler (line ~1679)

---

**Remember:** YouTube updates their ad system frequently. What works today might need adjustments tomorrow. This is why JAdSkip and similar extensions require regular updates.
