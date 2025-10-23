# 🚫 Ads Blocker - Quick Start Guide

## Installation & Testing

### 1. Load the Extension

1. Open Chrome/Edge DevTools
2. Go to `chrome://extensions` (or `edge://extensions`)
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `tab-suspend-pro` folder

### 2. Access the Ads Blocker

#### Via Popup

1. Click the BrowserGuard Pro extension icon
2. Look for "🚫 Ads Blocker Dashboard" button
3. Click to open the dashboard in a new tab

#### Via Right-Click Menu

1. Right-click anywhere on a webpage
2. Select "Open Ads Blocker Dashboard"

#### Via Settings

1. Click the extension icon → ⚙️ Settings
2. Click the "🚫 Ads Blocker" tab
3. Configure your preferences
4. Click "📈 Open Dashboard" to view stats

## Key Features at a Glance

### Main Dashboard

-   **Status Indicator** - Green = Active, Red = Inactive
-   **Quick Stats** - Total blocked, session blocked, data saved
-   **Performance Metrics** - Breakdown by category (ads, analytics, etc.)
-   **Top Blocked Domains** - See which sites are trying to serve ads

### Settings Tab

Toggle blocking for:

-   🎯 Ads - General advertisement networks
-   📊 Analytics - Tracking and analytics services
-   📸 Banners - Banner ads and display ads
-   🍪 Cookies - Cookie trackers and consent managers
-   🚫 Popups - Popup advertisements
-   🔗 Social - Social media embedded widgets

### Whitelist Tab

Whitelist domains to disable blocking on specific sites:

```
example.com
trusted-site.org
mysite.com
```

### Filters Tab

Add custom blocking patterns using wildcards:

```
*://ads.example.com/*
*://banner.*.com/*
*://tracker.site.com/analytics/*
```

## Common Use Cases

### Use Case 1: Block Everything

✅ Default setup - all categories enabled

-   Stats will show impressive blocking numbers
-   May break some site layouts temporarily

### Use Case 2: Essential Blocking Only

⚙️ Disable "Block Social Widgets"

-   Keeps most sites functional
-   Still blocks major ads and trackers

### Use Case 3: Minimal Impact

⚙️ Enable only:

-   Block Ads
-   Block Analytics
-   Block Cookie Trackers
-   Whitelist: facebook.com, youtube.com (if you need widgets)

### Use Case 4: Content Creator Mode

✅ Whitelist your own domain

-   Your ad partners' ads will serve
-   Other sites' ads blocked
-   Helps you test ad integration

## Tips & Tricks

### 🚀 Performance Boost

-   Enables faster page loads (fewer ad resources)
-   Reduces bandwidth usage
-   Lower CPU usage on ad-heavy sites

### 📊 View Your Impact

-   Open dashboard daily to see stats
-   Export stats to track trends over time
-   Share screenshots to show saved bandwidth

### 🛡️ Privacy Protection

-   Analytics blockers prevent tracking
-   Cookie trackers blocked
-   Social widgets blocked

### 🔧 Troubleshooting

**Site looks broken?**

1. Open dashboard
2. Find broken site in "Top Blocked Domains"
3. Copy the domain
4. Go to Whitelist tab
5. Paste domain and click "Add"

**Ads still showing?**

1. Check if blocker is enabled (toggle in dashboard)
2. Check if category is enabled (Settings tab)
3. Try adding custom filter for specific ad domain

**Want to block more?**

1. Go to Filters tab
2. Add custom patterns like `*://ads-*.example.com/*`
3. Check dashboard for more domains to block

## Statistics Explained

| Stat                  | Meaning                       | Impact            |
| --------------------- | ----------------------------- | ----------------- |
| **Total Blocked**     | All requests blocked ever     | Historical metric |
| **Session Blocked**   | Requests blocked this session | Current activity  |
| **Data Saved**        | Estimated MB of ad data       | Bandwidth saved   |
| **Ads Blocked**       | Advertisement networks        | Fewer ads shown   |
| **Analytics Blocked** | Tracking scripts              | Better privacy    |
| **Banners Blocked**   | Display ads                   | Cleaner pages     |
| **Cookies Blocked**   | Tracking cookies              | Reduced tracking  |

## Settings to Experiment With

### ✅ Try These Combinations

**Maximum Privacy**

```
✓ Block Ads
✓ Block Analytics
✓ Block Banners
✓ Block Popups
✓ Block Cookie Trackers
✓ Block Social Widgets
```

**Balanced**

```
✓ Block Ads
✓ Block Analytics
✓ Block Banners
✓ Block Cookie Trackers
- Block Popups (might already be blocked by browser)
- Block Social Widgets (might break some sites)
```

**Minimal**

```
✓ Block Ads
✓ Block Analytics
- Block Banners (may affect layout)
- Block Popups
- Block Cookie Trackers
- Block Social Widgets
```

## Command Reference

### Dashboard Commands

| Action                  | How                          |
| ----------------------- | ---------------------------- |
| Toggle blocking on/off  | Click status toggle          |
| Change category         | Click toggle in Settings tab |
| Add domain to whitelist | Enter domain, click Add      |
| Remove from whitelist   | Find domain, click Remove    |
| Add custom filter       | Enter pattern, click Add     |
| Reset statistics        | Click "🔄 Reset" button      |
| Export stats            | Click "📤 Export Statistics" |
| Export filters          | Click "📤 Export Filters"    |
| Import filters          | Click "📥 Import Filters"    |

## Browser Extensions Conflict

### Compatible With

-   uBlock Origin - Can use together (may be redundant)
-   Privacy Badger - Complementary blocking
-   HTTPS Everywhere - Different purpose
-   Most other extensions

### Notes

-   Running multiple ad blockers may have performance impact
-   BrowserGuard Pro's ads blocker is designed for efficiency
-   Can disable if you prefer lighter setup

## Performance Impact

### Positive Impact ✅

-   Faster page loads (less ad content to load)
-   Reduced bandwidth usage
-   Lower CPU usage
-   Better battery life on laptops
-   Smoother browsing experience

### Potential Issues ⚠️

-   Some sites may show "ad blocker detected" message
-   Rare layout issues if ads were important for spacing
-   Blocking too aggressively may break some functionality

### Mitigation

-   Add problem sites to whitelist
-   Disable specific categories if needed
-   Adjust custom filters

## Getting Help

### Dashboard Indicators

-   🟢 Green status = Working properly
-   🔴 Red status = Disabled or error
-   📊 Charts show current activity
-   📈 Numbers update in real-time

### Reset Everything

If something breaks:

1. Click "🔄 Reset" in dashboard
2. Statistics will be cleared
3. Blocking will restart fresh

### Default Whitelist is Empty

Start with no whitelisted sites for maximum blocking. Add sites as needed.

## Advanced Tips

### Custom Filter Examples

```
# Block all CDN ads
*://cdn-ads.com/*
*://cdn-*.adnetwork.com/*

# Block specific tracker
*://tracker.analytics.com/*

# Block regional ads
*://ads.*.in/*
```

### Export/Import Workflow

1. Configure perfect settings
2. Export filters
3. Share JSON with others
4. Others can import same config

### Regular Maintenance

-   Monthly: Review top blocked domains
-   Monthly: Reset statistics if desired
-   Quarterly: Review and update whitelist
-   Check dashboard when sites break

## What Gets Blocked?

### Definitely Blocked

-   Google Ads (DoubleClick)
-   Facebook Ads
-   Amazon Ads
-   Most display ads
-   Analytics trackers
-   Cookie consent managers

### Probably Blocked

-   Contextual ads
-   Social media trackers
-   Anonymous analytics

### Might Not Block

-   Ads loaded by JavaScript after page load
-   First-party ads on platform's own site
-   Ads in videos (YouTube)

## Next Steps

1. ✅ Open the dashboard
2. ✅ Check your blocking statistics
3. ✅ Explore the Settings tab
4. ✅ Try adding a domain to whitelist
5. ✅ Visit an ad-heavy site to see stats increase
6. ✅ Export your stats to see the impact

---

**Enjoy a faster, cleaner, more private browsing experience! 🎉**
