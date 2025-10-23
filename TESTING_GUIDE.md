# Testing Guide - Ads Blocker Feature

## Setup for Testing

### Prerequisites

-   Chrome/Edge browser (version 88+)
-   Developer mode enabled
-   Extension loaded unpacked

### Test Sites with Lots of Ads

Use these sites to test blocking effectiveness:

-   News websites (CNN, BBC, Yahoo News)
-   Article sites (Medium, Medium-like)
-   YouTube (for ad scripts)
-   Reddit (third-party ads)
-   Sports sites (ESPN, BBC Sport)

## Functional Testing

### Test 1: Dashboard Access

**Objective:** Verify dashboard opens from all access points

Steps:

1. Click extension icon → "🚫 Ads Blocker Dashboard" → Opens ✅
2. Right-click page → "Open Ads Blocker Dashboard" → Opens ✅
3. Options → "🚫 Ads Blocker" tab → "📈 Open Dashboard" → Opens ✅

Expected: Dashboard loads with current stats

---

### Test 2: Status Toggle

**Objective:** Verify on/off control works

Steps:

1. Open dashboard
2. Click status toggle in header
3. Observe indicator changes (🟢 ↔ 🔴)
4. Check that blocking is actually enabled/disabled by visiting an ad site

Expected:

-   Toggle changes color
-   Ads are blocked when enabled
-   Ads appear when disabled

---

### Test 3: Category Toggles

**Objective:** Verify each blocking category works

Steps:

1. Open Options → "🚫 Ads Blocker" tab
2. Toggle each category off one by one
3. Visit an ad-heavy site between each toggle
4. Observe changes in page layout

Expected:

-   Disabling "Block Ads" → Ad spaces reappear
-   Disabling "Block Analytics" → No visual change (expected)
-   Disabling "Block Banners" → Banner ads reappear
-   Each category affects appropriate content

---

### Test 4: Whitelist Management

**Objective:** Verify whitelist functionality

**Add to Whitelist:**

1. Open dashboard → Whitelist tab
2. Enter domain: "example.com"
3. Click "Add"
4. Verify domain appears in list

**Remove from Whitelist:**

1. Click "Remove" next to domain
2. Verify domain is removed

Expected:

-   Domains add/remove from list
-   Whitelisted domains show ads
-   Non-whitelisted domains don't

---

### Test 5: Custom Filters

**Objective:** Verify custom filter functionality

Steps:

1. Dashboard → Filters tab
2. Enter pattern: `*://ads.example.com/*`
3. Click "Add Filter"
4. Verify filter appears in list
5. Remove filter, verify it's gone

Expected:

-   Custom filters can be added/removed
-   Custom patterns match URLs appropriately

---

### Test 6: Statistics Tracking

**Objective:** Verify stats are recorded and displayed

Steps:

1. Open dashboard with stat counts noted
2. Visit ad-heavy website (news site, etc.)
3. Spend 1-2 minutes browsing
4. Return to dashboard
5. Verify stats increased

Expected:

-   "Total Blocked" increases
-   "Session Blocked" increases
-   "Data Saved" shows reasonable numbers
-   Top domains list updates

---

### Test 7: Export/Import Stats

**Objective:** Verify data export and import

**Export:**

1. Dashboard → Overview tab
2. Click "📤 Export Statistics"
3. JSON file downloads

**Import:**

1. Open any stats file
2. Dashboard → Settings tab
3. Click "📥 Import Filters"
4. Select JSON file
5. Verify data loads

Expected:

-   Export creates valid JSON
-   Import loads data successfully

---

### Test 8: Settings Persistence

**Objective:** Verify settings save across sessions

Steps:

1. Open Options → "🚫 Ads Blocker"
2. Disable "Block Ads"
3. Add "example.com" to whitelist
4. Close and reopen browser
5. Check settings are preserved

Expected:

-   Settings persist after browser restart
-   Whitelist entries remain
-   Category toggles stay as set

---

### Test 9: Dashboard Auto-Refresh

**Objective:** Verify 5-second refresh

Steps:

1. Open dashboard
2. Open another tab and visit ad-heavy site
3. Watch dashboard stats without manual refresh
4. Verify stats update automatically

Expected:

-   Stats update without user action
-   Updates happen roughly every 5 seconds
-   Dashboard stays responsive

---

### Test 10: Real-Time Blocking

**Objective:** Verify ads actually get blocked

Steps:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Visit ad-heavy site
4. Check that ad requests are blocked

Expected:

-   Ad requests show "canceled" status
-   Ad images/scripts don't load
-   Page loads faster without ads

---

## Performance Testing

### Test 11: Memory Usage

**Objective:** Verify minimal memory footprint

Steps:

1. Open Task Manager (Windows) / Activity Monitor (Mac)
2. Check Chrome memory before extension
3. Load extension and open dashboard
4. Check memory after
5. Visit ad-heavy site with blocking enabled
6. Monitor memory over 10 minutes

Expected:

-   Memory increase < 50MB for extension
-   Memory stays stable over time
-   No memory leaks

---

### Test 12: Page Load Speed

**Objective:** Verify ads blocker improves or doesn't harm speed

Steps:

1. Disable extension completely
2. Visit adsbygoogle.com redirect page (or news site)
3. Note load time
4. Re-enable extension
5. Reload same page
6. Compare load times

Expected:

-   With blocker: equal or faster load time
-   Without blocker: same or slower (due to ads)
-   Difference typically 0.5-2 seconds on ad-heavy sites

---

## UI/UX Testing

### Test 13: Responsive Design

**Objective:** Verify UI works on different screen sizes

Steps:

1. Open dashboard
2. Open DevTools → Toggle device toolbar
3. Test at different sizes:
    - Mobile: 375x667
    - Tablet: 768x1024
    - Desktop: 1920x1080
4. Verify all tabs and buttons work

Expected:

-   Layout adapts to screen size
-   Text remains readable
-   Buttons clickable on all sizes

---

### Test 14: Dark Mode (if applicable)

**Objective:** Verify colors work in system dark mode

Steps:

1. System Preferences → Dark Mode
2. Open dashboard
3. Check colors are legible
4. Click through all tabs

Expected:

-   Text is readable
-   Colors have good contrast
-   UI doesn't look broken

---

### Test 15: Tab Navigation

**Objective:** Verify tab switching works smoothly

Steps:

1. Dashboard open
2. Click each tab button in order
3. Go back using browser back button
4. Click tabs in random order
5. Verify content switches correctly

Expected:

-   Tab content changes smoothly
-   Animations are smooth
-   No visual glitches

---

## Integration Testing

### Test 16: Popup Integration

**Objective:** Verify popup button opens dashboard

Steps:

1. Click extension icon → "🚫 Ads Blocker Dashboard"
2. Check dashboard tab opens
3. Modify settings in dashboard
4. Go back to popup tab
5. Verify popup reflects changes

Expected:

-   Settings sync between popup and dashboard
-   Changes visible immediately

---

### Test 17: Context Menu Integration

**Objective:** Verify right-click menu works

Steps:

1. Right-click on webpage content
2. Look for "Open Ads Blocker Dashboard" option
3. Click it
4. Verify dashboard opens

Expected:

-   Menu option appears on webpages
-   Clicking opens dashboard in new tab

---

### Test 18: Options Page Integration

**Objective:** Verify options page controls work

Steps:

1. Open Options → "🚫 Ads Blocker" tab
2. Toggle each category
3. Add/remove whitelist entries
4. Open dashboard
5. Verify same settings shown there

Expected:

-   Settings sync between options and dashboard
-   All controls responsive

---

## Edge Cases & Error Handling

### Test 19: Invalid Whitelist Entries

**Objective:** Verify handling of invalid input

Steps:

1. Try entering invalid domain: "!!!invalid!!!"
2. Try empty entry: ""
3. Try special characters: "<script>"
4. Try duplicates: add same domain twice

Expected:

-   Invalid entries either rejected or sanitized
-   No crashes or errors
-   Duplicates prevented or ignored

---

### Test 20: Large Filter Lists

**Objective:** Verify handling of many custom filters

Steps:

1. Add 50+ custom filters
2. Check dashboard performance
3. Export and import large list
4. Verify list still works

Expected:

-   Dashboard remains responsive
-   No slowdown in page loading
-   Large lists handled gracefully

---

### Test 21: Storage Limits

**Objective:** Verify graceful handling of storage limits

Steps:

1. Keep dashboard open for days
2. Let statistics accumulate
3. Monitor storage usage
4. Check for any warnings

Expected:

-   Statistics continue to accumulate
-   No errors when storage full
-   Statistics still display correctly

---

## Compatibility Testing

### Test 22: Cross-Site Functionality

**Objective:** Verify blocker works across different sites

Test sites:

-   [ ] CNN/BBC (heavy ads)
-   [ ] Reddit (third-party ads)
-   [ ] YouTube (pre-roll ads)
-   [ ] Twitch (ads and overlays)
-   [ ] Email sites (Gmail - usually no ads, but test anyway)

Expected:

-   Blocker works on all sites
-   No site-specific breakage
-   Stats accumulate correctly

---

### Test 23: Browser Compatibility

**Objective:** Verify works on Chrome and Edge

Steps:

1. Test on Chrome latest
2. Test on Edge latest
3. Verify same functionality

Expected:

-   Works identically on both browsers

---

## Regression Testing

### Test 24: Other Features Still Work

**Objective:** Verify ads blocker doesn't break existing features

Test existing features:

-   [ ] Tab suspension still works
-   [ ] Tracker blocker still works
-   [ ] Analytics dashboard loads
-   [ ] Privacy features work
-   [ ] Session saving works
-   [ ] Cloud backup still functions

Expected:

-   All features continue to work normally
-   No interference between modules

---

## Stress Testing

### Test 25: Heavy Browsing

**Objective:** Verify stability under heavy use

Steps:

1. Open 20+ tabs
2. Visit various sites for 30 minutes
3. Keep dashboard open
4. Monitor for crashes or slowdowns
5. Check console for errors

Expected:

-   No crashes
-   Dashboard stays responsive
-   Memory remains stable
-   Statistics accumulate correctly

---

## Test Report Template

```
Test Case: [Number] - [Name]
Date: [Date]
Tester: [Name]
Browser: [Chrome/Edge Version]

Result: PASS / FAIL / PARTIAL

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happened]

Issues Found:
[Any problems or bugs]

Screenshots/Evidence:
[Attach if applicable]

Notes:
[Any additional observations]
```

## Quick Test Checklist

✅ Use this for quick smoke testing:

-   [ ] Extension loads
-   [ ] Popup opens dashboard
-   [ ] Settings toggle works
-   [ ] Whitelist works
-   [ ] Stats display
-   [ ] Ads are actually blocked (check network tab)
-   [ ] No console errors
-   [ ] Page loads faster with blocking on
-   [ ] All tabs work
-   [ ] Export works
-   [ ] Settings persist after reload

## Reporting Issues

When reporting bugs, include:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser and version
5. Screenshots if applicable
6. Console error messages (if any)
7. Extension version number

---

**Happy Testing! 🧪**
