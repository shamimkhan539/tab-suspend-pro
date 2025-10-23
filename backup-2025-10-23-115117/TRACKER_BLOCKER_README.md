# Tracker Blocker Feature

## Overview

The Tracker Blocker module provides comprehensive ad-blocking and privacy protection similar to uBlock Origin, integrated directly into Tab Suspend Pro. It uses Chrome's `declarativeNetRequest` API (Manifest V3 compatible) to efficiently block unwanted content.

## Features

### 1. **Multiple Filter Categories**

-   **Ads**: Blocks advertisements and sponsored content from major ad networks
-   **Trackers**: Blocks analytics and tracking scripts (Google Analytics, Facebook Pixel, etc.)
-   **Social Media**: Blocks social media widgets and embedded content
-   **Crypto Mining**: Blocks cryptocurrency mining scripts
-   **Malware**: Blocks known malicious domains

### 2. **Built-in Filter Lists**

The tracker blocker comes with pre-configured filter lists targeting:

#### Ad Networks

-   Google AdServices, DoubleClick, AdSense
-   Amazon Ads
-   Taboola, Outbrain
-   Criteo, AdRoll
-   And many more...

#### Analytics & Tracking

-   Google Analytics
-   Facebook Tracking
-   Hotjar, Mouseflow
-   Mixpanel, Amplitude
-   Segment, Heap
-   New Relic
-   Optimizely

#### Social Media Trackers

-   Facebook widgets
-   Twitter widgets
-   LinkedIn embeds
-   Pinterest widgets
-   AddThis, ShareThis

#### Crypto Mining

-   CoinHive
-   CryptoLoot
-   JSECoin
-   WebMinePool
-   And more...

### 3. **Custom Filtering**

-   Add your own custom URL patterns
-   Support for wildcard patterns (`*://`)
-   Easy management of custom filters

### 4. **Whitelist Management**

-   Add trusted domains to bypass blocking
-   Per-domain control
-   Easy add/remove functionality

### 5. **Statistics & Analytics**

-   Total blocked requests (all-time)
-   Session blocked requests
-   Breakdown by category (ads, trackers, social, crypto, malware)
-   Top blocked domains
-   Active rules count

### 6. **Import/Export**

-   Export your custom filters and whitelist
-   Import filter lists from JSON files
-   Share configurations across devices

## How to Use

### Accessing the Tracker Blocker Dashboard

1. **From Popup**: Click the "🛡️ Tracker Blocker Dashboard" button
2. **From Context Menu**: Right-click on any webpage → "Open Tracker Blocker Dashboard"
3. **Direct URL**: `chrome-extension://[your-extension-id]/tracker-dashboard.html`

### Managing Filter Categories

Toggle each category on/off:

-   **Block Ads**: Enable/disable ad blocking
-   **Block Trackers**: Enable/disable tracking script blocking
-   **Block Social Media**: Enable/disable social media widget blocking
-   **Block Crypto Mining**: Enable/disable crypto miner blocking
-   **Block Malware**: Enable/disable malware domain blocking

Changes take effect immediately.

### Adding to Whitelist

1. Enter a domain name in the whitelist input (e.g., `example.com`)
2. Click "Add" button
3. The domain will be excluded from all blocking rules

### Creating Custom Filters

1. Enter a URL pattern in the custom filter input
2. Use wildcard patterns like:
    - `*://example.com/*` - Block all requests to example.com
    - `*://*.ads.example.com/*` - Block all subdomains of ads.example.com
3. Click "Add Filter" button

### Exporting/Importing Filters

**Export:**

1. Click "Export Filters" button
2. Save the JSON file to your computer

**Import:**

1. Click "Import Filters" button
2. Select a previously exported JSON file
3. Your custom filters and whitelist will be merged with existing data

### Resetting Statistics

Click "Reset Statistics" to clear all blocking counters. This does not affect your filter settings.

## Technical Details

### API Used

-   `declarativeNetRequest`: For efficient request blocking
-   `declarativeNetRequestFeedback`: For tracking blocked requests
-   `webNavigation`: For session management
-   `webRequest`: For additional request monitoring

### Performance

-   Minimal CPU/memory overhead (native Chrome API)
-   Rules are compiled by Chrome for maximum efficiency
-   No JavaScript execution in web pages required
-   Works across all tabs simultaneously

### Privacy

-   All processing happens locally
-   No data sent to external servers
-   No tracking of browsing history
-   Settings stored locally in Chrome storage

## Filter List Format

Custom filters use Chrome's URL pattern format:

```
*://hostname/path
```

Examples:

-   `*://*.google-analytics.com/*` - Block Google Analytics
-   `*://example.com/ads/*` - Block ads folder on example.com
-   `*://*.doubleclick.net/*` - Block DoubleClick network

## Permissions Required

-   `declarativeNetRequest`: Create and manage blocking rules
-   `declarativeNetRequestFeedback`: Track blocked requests
-   `webNavigation`: Monitor page navigation
-   `webRequest`: Additional request monitoring
-   `<all_urls>`: Apply blocking rules to all websites

## Comparison with uBlock Origin

While not as comprehensive as uBlock Origin, this tracker blocker provides:

✅ **Similar Features:**

-   Ad and tracker blocking
-   Custom filter support
-   Whitelist management
-   Statistics tracking
-   Import/export functionality

⚠️ **Differences:**

-   Smaller built-in filter list (focused on most common trackers)
-   Simpler UI (integrated with Tab Suspend Pro)
-   No element hiding (cosmetic filtering)
-   No dynamic filtering rules
-   No advanced filter syntax

## Best Practices

1. **Start with Default Settings**: The default configuration blocks most ads and trackers
2. **Use Whitelist Sparingly**: Only whitelist domains you trust
3. **Review Statistics**: Check which domains are being blocked
4. **Export Your Configuration**: Backup your custom filters regularly
5. **Update Regularly**: Keep the extension updated for latest filter improvements

## Troubleshooting

### Site Not Loading Properly

1. Check if the domain is being blocked
2. Add the domain to whitelist
3. Disable specific filter categories

### Too Many Requests Blocked

1. Review top blocked domains
2. Whitelist legitimate services
3. Adjust filter category settings

### Custom Filter Not Working

1. Verify the URL pattern syntax
2. Check if domain is whitelisted
3. Ensure tracker blocker is enabled

## Future Enhancements

Planned features for future releases:

-   [ ] Element hiding (cosmetic filtering)
-   [ ] More comprehensive filter lists
-   [ ] Automatic filter list updates
-   [ ] Per-site settings
-   [ ] Advanced filter syntax support
-   [ ] Integration with public filter lists (EasyList, EasyPrivacy)

## Contributing

To add new filter patterns:

1. Identify the tracking/ad domain
2. Create appropriate URL pattern
3. Test the filter
4. Add to the appropriate category in `tracker-blocker.js`

## License

This feature is part of Tab Suspend Pro and follows the same license terms.
