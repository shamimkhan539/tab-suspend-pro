# YouTube Ad Blocker - Visual Implementation Guide

## 🎯 Problem → Solution Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    4 ISSUES FIXED                               │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ISSUE #1: YouTube Music - Next Button Ads                       │
├──────────────────────────────────────────────────────────────────┤
│ User clicks Next button                                          │
│         ↓                                                         │
│ [PROBLEM] Ads appear when clicking next                         │
│         ↓                                                         │
│ SOLUTION: handleYouTubeMusicButtons()                           │
│   • Intercepts next/prev button clicks                          │
│   • Waits 1.5s for player to load track                         │
│   • Triggers ad check immediately                               │
│         ↓                                                         │
│ ✅ Ads are skipped automatically                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ISSUE #2: Auto-Pause / "Still Watching?" Popup                  │
├──────────────────────────────────────────────────────────────────┤
│ Video plays for extended time (30+ min)                          │
│         ↓                                                         │
│ [PROBLEM] Auto-pause with "Still Watching?" popup               │
│         ↓                                                         │
│ SOLUTION: Enhanced checkIdle() + setupAutoContinue()            │
│                                                                  │
│   setupAutoContinue():                                           │
│   • Monitors pause events on all videos                         │
│   • Detects if pause is due to idle                             │
│   • Auto-resumes if system pause (not user)                     │
│                                                                  │
│   checkIdle():                                                   │
│   • Method 1: yt-confirm-dialog-renderer                        │
│   • Method 2: paper-dialog [role="alertdialog"]                 │
│   • Method 3: #confirm-button validation                        │
│   • YouTube Music: ytmusic-you-there-renderer                   │
│   • Clicks "Continue" / "Yes" button                            │
│         ↓                                                         │
│ ✅ Video continues playing uninterrupted                        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ISSUE #3: YouTube Shorts - Frequent Pause/Play                  │
├──────────────────────────────────────────────────────────────────┤
│ Watching YouTube Shorts                                          │
│         ↓                                                         │
│ [PROBLEM] Video pauses and plays repeatedly                     │
│         ↓                                                         │
│ SOLUTION: handleShorts() - Pause Prevention                     │
│                                                                  │
│   Detection:                                                     │
│   • Detects /shorts/ in URL                                     │
│   • Identifies ytd-reel-video-renderer                          │
│                                                                  │
│   Pause Prevention:                                              │
│   • Monitors pause events                                        │
│   • Only auto-resumes system pauses (!e.isTrusted)              │
│   • Resumes after 100ms delay                                   │
│                                                                  │
│   Error Handling:                                                │
│   • Catches video load errors                                   │
│   • Auto-reloads video element                                  │
│         ↓                                                         │
│ ✅ Shorts play smoothly without cycling                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ISSUE #4: YouTube Shorts - Ads Still Show                       │
├──────────────────────────────────────────────────────────────────┤
│ Watching YouTube Shorts                                          │
│         ↓                                                         │
│ [PROBLEM] Ads appear in Shorts                                  │
│         ↓                                                         │
│ SOLUTION: Multi-layered Shorts Ad Blocking                      │
│                                                                  │
│   Layer 1: Enhanced Ad Detection                                │
│   • Check: video.closest("ytd-reel-video-renderer")             │
│   • Duration: < 120 seconds                                     │
│   • URL: includes "googlevideo.com"                             │
│                                                                  │
│   Layer 2: Skip Logic                                            │
│   • Player API: player.onAdUxClicked()                          │
│   • Seeking: Jump to end of ad                                  │
│                                                                  │
│   Layer 3: DOM Hiding                                            │
│   • Hide ytd-ad-slot-renderer elements                          │
│   • Hide [data-ad-type] elements                                │
│   • Hide .shorts-ad elements                                    │
│   • Checked every 1 second                                      │
│         ↓                                                         │
│ ✅ Ads are blocked or skipped in Shorts                         │
└──────────────────────────────────────────────────────────────────┘
```

## 🔧 Architecture Overview

```
youtube-blocker.js
│
├─── INITIALIZATION
│    ├─ loadSettings()          [Load from background]
│    ├─ setupVideoListeners()   [Monitor all videos]
│    ├─ setupAutoContinue()     [Prevent auto-pause]
│    ├─ handleYouTubeMusicButtons() [Music controls]
│    └─ handleShorts()          [Shorts specific]
│
├─── EVENT LISTENERS
│    ├─ Video "play"            → checkAds()
│    ├─ Video "pause"           → checkIdle() + auto-resume
│    ├─ Navigation "navigate"   → Reset state
│    ├─ Mutation Observer       → Detect popups
│    └─ Button click (Music)    → checkAds() + delay
│
├─── AD BLOCKING
│    ├─ getAdPlayer()           [Detect ad video]
│    ├─ tryClickSkipButton()    [API method]
│    ├─ trySkipAd()             [Seeking method]
│    └─ checkAds()              [Main orchestrator]
│
├─── POPUP HANDLING
│    ├─ checkIdle()             [Detect popup]
│    ├─ clickContinue()         [Click button]
│    └─ Popup Observer          [Real-time detection]
│
└─── SHORTS SPECIFIC
     ├─ Shorts Detection        [URL + class check]
     ├─ Pause Prevention         [Auto-resume]
     ├─ Error Handling           [Video reload]
     └─ Ad Element Hiding        [DOM removal]
```

## 📊 Function Call Flow

### YouTube Music (Next Button Scenario)

```
User Clicks Next
    ↓
handleYouTubeMusicButtons()
    ├─ Detects button click
    └─ Schedules checkAds() in 1500ms
            ↓
        checkAds()
            ├─ tryClickSkipButton() [Try API]
            ├─ Wait 1000ms
            └─ trySkipAd() [Try seeking]
                    ↓
                Ad Skipped ✅
```

### Regular YouTube (Still Watching Scenario)

```
Video plays 30+ minutes
    ↓
System auto-pauses
    ↓
video.pause event triggers
    ↓
setupAutoContinue()
    ├─ Detects pause (not user)
    └─ Wait 300ms
            ↓
        checkIdle()
            ├─ Method 1: yt-confirm-dialog-renderer
            ├─ Method 2: paper-dialog
            └─ Method 3: #confirm-button
                    ↓
                Clicks "Continue"
                    ↓
                Video Resumes ✅
```

### YouTube Shorts (Pause Cycling Scenario)

```
Shorts video playing
    ↓
System injects pause
    ↓
video.pause event (non-user)
    ↓
handleShorts()
    ├─ Detects non-user pause (!e.isTrusted)
    └─ Wait 100ms
            ↓
        video.play()
                ↓
            Video Resumes ✅
```

### YouTube Shorts (Ad Scenario)

```
Shorts video playing
    ↓
Ad loads (< 120 sec duration)
    ↓
getAdPlayer() detects ad
    ↓
checkAds()
    ├─ tryClickSkipButton()
    ├─ Wait 1000ms
    └─ trySkipAd()
            ↓
        Ad Skipped ✅

ALSO:
    ↓
handleShorts() monitors DOM
    ├─ Detects ytd-ad-slot-renderer
    └─ display: none
            ↓
        Ad Hidden ✅
```

## 📈 State Management

```
┌─────────────────────────────────────────────────┐
│           Global State Variables                │
├─────────────────────────────────────────────────┤
│ blockEnabled: boolean                           │
│   └─ Is ad blocker turned on?                   │
│                                                 │
│ isYouTube: boolean                              │
│   └─ Regular YouTube domain?                    │
│                                                 │
│ isYouTubeMusic: boolean                         │
│   └─ YouTube Music domain?                      │
│                                                 │
│ isYouTubeShorts: boolean                        │
│   └─ Shorts content detected?                   │
│                                                 │
│ adSlots: Array                                  │
│   └─ Ad slots captured from responses           │
│                                                 │
│ lastBlockedAdURL: string                        │
│   └─ Track ad to prevent re-blocking            │
│                                                 │
│ lastBlockedTime: number                         │
│   └─ Timestamp of last block (ms)               │
│                                                 │
│ autoResumeActive: boolean                       │
│   └─ Auto-continue feature active?              │
└─────────────────────────────────────────────────┘
```

## 🔍 Detection Methods Priority

### Idle Popup Detection (Checked in Order)

```
1. yt-confirm-dialog-renderer
   └─ Newest YouTube UI structure

2. paper-dialog[role="alertdialog"]
   └─ Legacy but still used

3. #confirm-button + parentDialog validation
   └─ Fallback classic method

4. YouTube Music: ytmusic-you-there-renderer
   └─ Music-specific popup

All methods validated by checking text content:
✓ "video paused"
✓ "continue watching"
✓ "still watching"
✓ "still there"
✓ "paused"
```

### Ad Detection Hierarchy

```
Regular YouTube/Music:
  1. URL contains "googlevideo.com/videoplayback"
  2. Duration: 0 < duration < 120 seconds
  3. Not in Shorts container

YouTube Shorts:
  1. In "ytd-reel-video-renderer" container
  2. URL contains "googlevideo.com"
  3. Duration: 0 < duration < 120 seconds
```

## 🎨 Button/Element Selectors

### YouTube Music Next Button

```javascript
'[data-tooltip="Next"]'
'[aria-label*="next"]'
'button[aria-label*="next"]'

Similarly for Previous:
'[data-tooltip="Previous"]'
'[aria-label*="previous"]'
```

### Idle Continue Button

```javascript
// Text-based (all containers)
"yes", "continue", "watch"

// Aria labels
aria-label="Yes"
aria-label="Continue"
aria-label="Watch"

// ID-based (legacy)
#confirm-button
```

### Ad Elements (Shorts)

```javascript
"ytd-ad-slot-renderer";
"[data-ad-type]";
".shorts-ad";
```

## 📱 Timeline Example: YouTube Music Session

```
[00:00] User opens YouTube Music
        ↓
[00:01] loadSettings() called
        ↓
[00:02] setupVideoListeners() activated
        ↓
[00:05] User clicks Next button
        ↓
[00:06] handleYouTubeMusicButtons() detects click
        ↓
[00:07] Music starts loading new track
        ↓
[01:35] checkAds() triggers (1.5s after click)
        ↓
[01:36] Ad detected on new track
        ↓
[01:37] tryClickSkipButton() uses Player API
        ↓
[01:38] Wait 1 second
        ↓
[01:39] trySkipAd() seeks to end
        ↓
[01:40] ✅ Music continues, ad skipped
```

## 🚨 Error Scenarios Handled

```
❌ Scenario: Ad player not found
   → Skip attempt, try again in 2 seconds

❌ Scenario: Popup not detected
   → Retry with next detection method
   → Check again in 1 second

❌ Scenario: Video load error in Shorts
   → Call video.load()
   → Continue playing

❌ Scenario: Settings not loaded
   → Retry in 1 second
   → Max 3 retries before giving up

❌ Scenario: Pause event from user
   → Don't auto-resume
   → Only auto-resume system pauses
```

---

**Last Updated**: November 4, 2025
**Complexity**: High-level multi-layer approach
**Coverage**: All YouTube domains and content types
