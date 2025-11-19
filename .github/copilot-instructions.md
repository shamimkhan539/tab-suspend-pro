# BrowserGuard Pro - AI Coding Agent Instructions

## Project Overview

**BrowserGuard Pro** is a Chrome Manifest V3 extension providing intelligent tab suspension, ad/tracker blocking, session management, and analytics. Core functionality centers around the `TabSuspendManager` class in `background.js` (3400+ lines) that orchestrates all feature modules.

## Architecture & Data Flow

### Core Service Worker Pattern

```
background.js (Service Worker)
  ├── TabSuspendManager (main orchestrator)
  ├── importScripts() → loads feature modules
  └── Chrome Extension APIs (tabs, storage, alarms, etc.)
```

All feature modules are **plain JavaScript classes** loaded via `importScripts()` at the top of `background.js`:

-   `SessionManager` - session snapshots and templates
-   `SmartTabOrganizer` - auto-grouping and workspace profiles
-   `PerformanceAnalytics` / `TabActivityAnalytics` - memory/usage tracking
-   `PrivacyManager` - privacy controls
-   `CloudBackupManager` - export/import settings
-   `TrackerBlocker` - ad/tracker blocking via declarativeNetRequest
-   `AdsBlocker` - additional ad blocking

**Critical**: No ES6 modules (`import/export`). Service workers use `importScripts()` exclusively.

### Communication Architecture

**Three-world isolation system for YouTube ad blocking:**

1. **ISOLATED world** (`youtube-blocker-coordinator.js`) - Chrome extension APIs

    - Loads settings via `chrome.runtime.sendMessage()`
    - Communicates with MAIN world via `window.postMessage()`

2. **MAIN world** (`youtube-blocker-yt-main.js`, `youtube-blocker-ytm-main.js`) - Page context

    - Direct access to YouTube's player API
    - Receives commands from ISOLATED world via `window.postMessage()`
    - Based on JAdSkip's proven approach (skip via `player.onAdUxClicked()`)

3. **Background service worker** - Extension logic
    - Message handler pattern: `chrome.runtime.onMessage.addListener()`
    - All UI→Background communication uses `action` property

**Message handler pattern example:**

```javascript
// In background.js setupMessageHandlers()
case "get-youtube-blocker-settings":
    const settings = await chrome.storage.sync.get("consolidatedSettings");
    sendResponse(settings.consolidatedSettings.adsBlocker);
    break;
```

### Storage Strategy

-   **`chrome.storage.sync`**: User settings (consolidated under `consolidatedSettings` key)
-   **`chrome.storage.local`**: Runtime state (suspended tabs metadata, statistics)
-   **Metadata versioning**: `metadataVersion` field for schema migrations
-   **Suspended tabs**: Stored in `suspendedMeta` Map with `{ originalUrl, title, favicon, suspendedAt, groupId }`

## Critical Developer Workflows

### Local Development & Testing

```powershell
# Load extension
# Navigate to: chrome://extensions/ → Developer mode → Load unpacked

# Watch for errors (service worker)
# chrome://extensions/ → Background page → Console

# Test YouTube blocking
# Navigate to youtube.com with DevTools console open
# Look for: "[YouTube Blocker Coordinator] Initialized"
```

**Debugging tips:**

-   Service worker console resets on sleep/wake - check immediately after actions
-   Content script console is per-tab (DevTools → Console → select content script context)
-   Use `console.log` with clear prefixes: `[YouTube Blocker]`, `[Background]`, etc.

### Building & Deployment

No build step required - pure JavaScript extension. Key files to verify:

1. `manifest.json` - Ensure permissions and content_scripts are correct
2. `background.js` - Check all `importScripts()` paths
3. Content scripts must match URL patterns in manifest

### Testing Approach

Located in `tests/` but currently minimal coverage:

-   `tests/integration/` - Manual test suites (see `dashboard-test.js`)
-   `tests/unit/` - Unit test stubs
-   **Primary testing**: Manual testing via extension popup and dashboards

## Project-Specific Patterns

### Tab Suspension Flow

```javascript
// 1. Mark tab as suspended
suspendedTabs.add(tabId);
suspendedMeta.set(tabId, { originalUrl, title, favicon, suspendedAt });

// 2. Navigate to suspended placeholder
chrome.tabs.update(tabId, {
    url:
        chrome.runtime.getURL("ui/suspended/suspended.html") +
        "?url=" +
        encodeURIComponent(originalUrl),
});

// 3. Store metadata persistently
await chrome.storage.local.set({ suspendedTabState: [...suspendedMeta] });
```

**Critical timing issues:**

-   3-second delay on init (`setTimeout`) to avoid Chrome session restore conflicts
-   `isRecreating` flag prevents infinite tab recreation loops
-   Duplicate detection uses 30% similarity threshold

### Settings Consolidation Pattern

All feature settings stored under single `consolidatedSettings` key:

```javascript
{
    adsBlocker: { enabled: true, blockYoutubeAds: true, ... },
    trackerBlocker: { enabled: true, blockAds: true, ... },
    sessionManager: { enabled: true, autoSaveFrequency: "daily", ... },
    // etc.
}
```

Always access via `chrome.storage.sync.get("consolidatedSettings")` and update entire object.

### Browser Compatibility Layer

`src/utils/browser-compat.js` provides cross-browser wrappers:

```javascript
// Don't use chrome.tabGroups directly
await browserCompat.safeTabGroupsUpdate(groupId, properties);

// Check capabilities before using
if (browserCompat.capabilities.tabGroups) { ... }
```

Handles Edge, Brave, Opera differences (e.g., tab groups not supported everywhere).

### Context Menu Pattern

All context menus created in `setupContextMenus()`:

-   Menu IDs use kebab-case: `"suspend-tab"`, `"restore-tab-group"`
-   Click handler in `handleContextMenuClick(info, tab)`
-   Always check `info.menuItemId` in switch statement

### Dashboard Communication

UI dashboards (`ui/dashboards/*`) communicate via messages:

```javascript
// Dashboard sends
const response = await chrome.runtime.sendMessage({
    action: "get-ads-blocker-data"
});

// Background handles
case "get-ads-blocker-data":
    return this.adsBlocker.getDashboardData();
```

All actions prefixed by feature: `get-ads-blocker-data`, `update-tracker-blocker-settings`, etc.

## Common Gotchas

1. **Service worker lifecycle**: Background script can sleep. Always reload state from storage in message handlers.
2. **Suspended tab restoration**: Check if URL still exists before restoring (handle 404s gracefully).
3. **Tab groups**: Not all browsers support them. Use `browserCompat` wrappers.
4. **YouTube ad blocking**: Requires both ISOLATED and MAIN world scripts. Don't combine.
5. **CSP violations**: No inline scripts in HTML. All logic in separate `.js` files.
6. **Manifest permissions**: Adding new Chrome APIs requires updating `permissions` in `manifest.json`.
7. **DeclarativeNetRequest**: Rule IDs must be unique integers. Max 30k rules per extension.

## Key Files Reference

-   `background.js` - Main orchestrator (study `handleMessage()` for all actions)
-   `manifest.json` - Permissions, content scripts, commands
-   `src/content/youtube-blocker-coordinator.js` - ISOLATED world coordinator
-   `src/content/youtube-blocker-yt-main.js` - MAIN world YouTube player manipulation
-   `src/utils/browser-compat.js` - Cross-browser API wrappers
-   `ui/popup/popup.js` - Main popup interface
-   `ui/options/options.js` - Settings page (2000+ lines)

## When Adding New Features

1. Create module class in `src/modules/<feature>/`
2. Add `importScripts()` in `background.js` constructor
3. Initialize in `TabSuspendManager` constructor: `this.featureName = new FeatureClass()`
4. Add message handlers in `handleMessage()` switch statement
5. Add UI in `ui/dashboards/<feature>/` or `ui/options/`
6. Update `manifest.json` if new permissions needed
7. Add to `consolidatedSettings` schema if configurable

## Documentation Standards

**CRITICAL**: All documentation must be managed in the `docs/` folder:

-   **Always read** documentation from `docs/` when researching features
-   **Add new docs** to `docs/` - never create `.md` files in project root
-   **Update existing docs** in `docs/` folder only
-   **Delete obsolete docs** from `docs/` (never leave orphaned files in root)

Exception files (keep in root):

-   `README.md` - Main project readme
-   `CHANGELOG.md` - Version history (use `scripts/update-changelog.js`)
-   `LICENSE` - License file

Documentation structure:

-   `docs/features/` - Feature-specific guides
-   `docs/api/` - API documentation
-   `docs/guides/` - User guides and tutorials
-   `docs/development/` - Development documentation

## Recent Major Changes

-   **v2.1.0**: Added TrackerBlocker with 600+ patterns
-   **v2.0.0**: Migrated to consolidated settings, fixed duplicate tab restoration
-   YouTube blocking uses JAdSkip approach (seek to end + trigger `onAdUxClicked`)
-   Removed Google Drive OAuth (CSP compliance, simplified to local export/import)
