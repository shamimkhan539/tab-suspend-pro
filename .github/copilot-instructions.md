# BrowserGuard Pro — Copilot Instructions

**Chrome Manifest V3 extension** — tab suspension, ad/tracker blocking, session management, analytics. See [docs/](../docs/) for feature docs.

## Architecture

Single service worker (`background.js`, ~3200 lines) with one orchestrator class `TabSuspendManager`. All feature modules are plain JS classes loaded via `importScripts()` — **no ES6 `import/export`**.

### Module Map

| `importScripts()` order                          | Class                  | Instance                    |
| ------------------------------------------------ | ---------------------- | --------------------------- |
| `src/utils/browser-compat.js`                    | — (utilities)          | `browserCompat`             |
| `src/modules/session-manager/session-manager.js` | `SessionManager`       | `this.sessionManager`       |
| `src/modules/smart-organizer/smart-organizer.js` | `SmartTabOrganizer`    | `this.smartOrganizer`       |
| `src/modules/analytics/performance-analytics.js` | `PerformanceAnalytics` | `this.performanceAnalytics` |
| `src/modules/analytics/activity-analytics.js`    | `TabActivityAnalytics` | `this.activityAnalytics`    |
| `src/modules/privacy/privacy-manager.js`         | `PrivacyManager`       | `this.privacyManager`       |
| `src/modules/cloud-sync/cloud-backup.js`         | `CloudBackupManager`   | `this.cloudBackup`          |
| `src/modules/tracker-blocker/tracker-blocker.js` | `TrackerBlocker`       | `this.trackerBlocker`       |
| `src/modules/ads-blocker/ads-blocker.js`         | `AdsBlocker`           | `this.adsBlocker`           |

### YouTube Ad Blocking: Three-World Isolation

- **ISOLATED world** (`src/content/youtube-blocker-coordinator.js`) — Chrome APIs + `window.postMessage()` to MAIN world
- **MAIN world** (`youtube-blocker-yt-main.js` / `youtube-blocker-ytm-main.js`) — direct YouTube player API access (`player.onAdUxClicked()`)
- **Never combine ISOLATED and MAIN world scripts.**

### Storage

- `chrome.storage.sync` → `consolidatedSettings` (single key, all feature settings)
- `chrome.storage.local` → `suspendedTabState` (runtime state), `adsBlockerSettings` (mirror)
- Always read/write the full `consolidatedSettings` object; never partial updates.

```javascript
const { consolidatedSettings } = await chrome.storage.sync.get(
    "consolidatedSettings",
);
consolidatedSettings.featureName.property = value;
await chrome.storage.sync.set({ consolidatedSettings });
```

`consolidatedSettings` shape: see `initializeDefaultSettings()` at line 84 of `background.js`.

## Naming Conventions

| Domain                         | Convention                  | Example                                         |
| ------------------------------ | --------------------------- | ----------------------------------------------- |
| Classes                        | PascalCase                  | `TabSuspendManager`, `AdsBlocker`               |
| Class files / folders          | kebab-case                  | `ads-blocker.js`, `cloud-sync/`                 |
| Core tab/group message actions | camelCase                   | `suspendTab`, `saveTabGroup`, `restoreAllTabs`  |
| Feature module message actions | `feature-verb[-noun]` kebab | `tracker-get-dashboard`, `get-ads-blocker-data` |
| Context menu IDs               | kebab-case                  | `suspend-tab`, `restore-tab-group`              |
| Alarm IDs                      | kebab-case                  | `cloud-sync`, `privacy-cleanup`                 |
| UI page managers               | `XxxManager`                | `PopupManager`, `OptionsManager`                |

## Message Passing Pattern

```javascript
// UI (dashboard/popup) sends:
const response = await chrome.runtime.sendMessage({ action: "feature-get-data" });

// background.js handleMessage() handles:
case "feature-get-data":
    sendResponse(this.featureModule.getDashboardData());
    break;
```

All message handling is in `handleMessage()` → big switch on `message.action`.

## Adding a New Feature

1. Create `src/modules/<feature>/<feature>.js` with a plain JS class
2. Add `importScripts('src/modules/<feature>/<feature>.js')` at the top of `background.js`
3. Instantiate: `this.featureName = new FeatureClass()` in `TabSuspendManager` constructor
4. Add `case` blocks in `handleMessage()` using `feature-verb` kebab action names
5. Add UI in `ui/dashboards/<feature>/` and/or `ui/options/sections/`
6. Add to `consolidatedSettings` in `initializeDefaultSettings()`
7. Update `manifest.json` if new Chrome API permissions are needed

## Critical Gotchas

- **Service worker sleeps**: Always re-read state from `chrome.storage` in message handlers — in-memory state may be gone.
- **3s init delay**: `restoreOrphanedSuspendedTabs` runs after 3s intentionally (avoids Chrome session-restore race).
- **`isRecreating` flag**: Guards against infinite tab recreation loops — never remove it.
- **Tab groups**: Always use `browserCompat` wrappers, not `chrome.tabGroups` directly — not supported on all Chromium browsers.
- **CSP**: No inline scripts in any HTML file. All logic must be in separate `.js` files.
- **DeclarativeNetRequest**: Rule IDs must be unique positive integers. Extension cap: 30,000 rules.
- **Suspended tab detection**: Uses 30% URL similarity threshold for duplicate detection.

## Development & Testing

No build step. Load via `chrome://extensions` → Developer mode → Load unpacked.

- Service worker logs: Extensions page → "background page" → Console (resets on sleep)
- Content script logs: DevTools → Console → select content script context (per-tab)
- Tests: `tests/integration/` (manual, run in-browser); `tests/unit/` (stubs). Primary method is manual testing.
- Log prefix convention: `[YouTube Blocker]`, `[Background]`, `[TabSuspendManager]`

## Documentation Standards

- All docs go in `docs/` (`docs/features/`, `docs/api/`, `docs/guides/`, `docs/development/`)
- Never create `.md` files in subdirectories other than `docs/`
- Exception: `README.md`, `CHANGELOG.md`, `LICENSE` stay in root
- Update `CHANGELOG.md` via `node scripts/update-changelog.js`
- **Update existing docs** in `docs/` folder only
- **Delete obsolete docs** from `docs/` (never leave orphaned files in root)

Exception files (keep in root):

- `README.md` - Main project readme
- `CHANGELOG.md` - Version history (use `scripts/update-changelog.js`)
- `LICENSE` - License file

Documentation structure:

- `docs/features/` - Feature-specific guides
- `docs/api/` - API documentation
- `docs/guides/` - User guides and tutorials
- `docs/development/` - Development documentation

## Recent Major Changes

- **v2.1.0**: Added TrackerBlocker with 600+ patterns
- **v2.0.0**: Migrated to consolidated settings, fixed duplicate tab restoration
- YouTube blocking uses JAdSkip approach (seek to end + trigger `onAdUxClicked`)
- Removed Google Drive OAuth (CSP compliance, simplified to local export/import)
