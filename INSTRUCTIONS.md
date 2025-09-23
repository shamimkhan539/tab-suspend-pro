# Tab Suspend Pro – Developer & User Instructions

This document complements `README.md` with deeper, task‑oriented guidance for installing, configuring, extending, and maintaining the extension. It is split into sections for end users, power users, and developers.

---

## 1. Quick Start (Users)

1. Open Chrome / Edge (Chromium).
2. Go to `chrome://extensions/` (or `edge://extensions/`).
3. Enable Developer Mode (toggle in the top right).
4. Click **Load unpacked** and select the project folder.
5. Pin the extension from the toolbar puzzle icon.
6. Click the icon to open the popup.
7. (Optional) Open **Settings** from the popup (gear icon) to adjust auto‑suspend timing, whitelist, and advanced options.

---

## 2. Core Concepts

| Concept              | Description                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Suspension           | Replaces a tab's URL with the internal `suspended.html` placeholder storing original URL & metadata in query params.     |
| Restoration          | When a suspended tab is activated or requested to restore, the original URL is recovered from query parameters.          |
| Whitelist            | URL or domain patterns that are never suspended (simple `startsWith` matching).                                          |
| Tab Groups           | Can be bulk‑suspended/restored unless excluded in settings.                                                              |
| Service Worker State | Background logic runs in `background.js` (Manifest V3 service worker) and can unload; state is reconstructed on startup. |
| Suggestions          | A heuristic ranking of inactive, non‑whitelisted, non‑active tabs for potential suspension.                              |

---

## 3. Feature Guide (Users)

### Popup Actions

-   Suspend Current Tab
-   Suggest Next Suspend (shows candidates in popup)
-   Restore All Tabs
-   Suspend/Restore Tab Groups (toggle view → select group → suspend / restore)
-   Never suspend this URL / Never suspend this domain (adds to whitelist instantly)

### Settings Page (`options.html`)

-   Enable / Disable the whole system
-   Auto‑suspend timer (minutes or hours)
-   Exclude selected tab groups
-   Manage URL whitelist (no wildcards needed; prefix matching)
-   Advanced toggles: suspend audio tabs, notifications, aggressive mode (placeholder), etc.

### Suspended Page (`suspended.html`)

-   Minimal placeholder to save memory
-   Clicking restores original URL

---

## 4. Whitelist Rules

The whitelist is a simple array of string prefixes checked via:

```
this.settings.whitelistedUrls.some(pattern => url.startsWith(pattern))
```

Recommendations:

-   To cover an entire domain, use just the hostname (e.g. `github.com`).
-   To scope to protocol+host, include protocol (e.g. `https://intranet.corp/`).
-   For Chrome internal pages: `chrome://`, `edge://`, `about:` are already preloaded.
-   To include a dev server range: `http://localhost:` covers any port.

(Enhancement idea: convert to regex or wildcard matching; see Section 11.)

---

## 5. Architecture Overview

```
background.js    -> Core logic: suspension, restoration, menu, messaging, heuristics
popup.(html/js)  -> User dashboard + quick actions
options.(html/js)-> Settings management (sync storage)
content.js       -> (If used) tab activity pings (updateActivity messages)
suspended.(html/js)-> Placeholder + restore trigger
storage (sync)   -> User settings (tabSuspendSettings)
storage (local)  -> Transient suggestion cache (suggestions, suggestionTimestamp)
```

### Persistence Notes

-   `this.suspendedTabs` (in memory) is rebuilt on service worker restart via URL scan (`reconstructSuspendedTabs`).
-   User settings survive reloads via `chrome.storage.sync`.

---

## 6. Storage Schema (sync)

```
{
  enabled: boolean,
  autoSuspendTime: number,           // minutes or hours (converted externally)
  timeUnit: 'minutes' | 'hours',
  excludedGroups: number[],          // Chrome tab group IDs
  whitelistedUrls: string[],
  suspendAudio: boolean,
  showNotifications: boolean,
  aggressiveMode: boolean
}
```

Local storage keys:

```
{
  suggestions: Suggestion[],
  suggestionTimestamp: number
}
```

Suggestion object shape:

```
{
  id: number,              // tabId
  title: string,
  url: string,
  inactiveTime: number,    // minutes
  memoryEstimate: number,  // MB
  score: number
}
```

---

## 7. Content Security Policy (CSP)

Manifest V3 enforces a strict CSP.
Do NOT:

-   Use inline `<script>` tags.
-   Use inline event handlers (`onclick="..."`).
-   Use `eval` or dynamic function constructors.

Correct patterns:

-   Add listeners via `element.addEventListener('click', handler)`.
-   Build dynamic UI nodes with `createElement` and attach listeners programmatically.
-   Keep all logic in external `.js` files referenced with `<script src="...">`.

We already refactored whitelist removal to avoid inline handlers.

---

## 8. Manual Test Checklist

After making changes, verify:

1. Load unpacked extension – no console errors in service worker.
2. Suspend current tab – `suspended.html` loads with encoded params.
3. Restore suspended tab – original URL reinstated.
4. Add URL to whitelist – attempt to suspend; must be skipped (check logs).
5. Add domain to whitelist – another tab on same domain should be excluded.
6. Group suspend – all tabs except active fallback are replaced.
7. Group restore – all previously suspended tabs in group restore.
8. Extension reload – suspended tabs are recognized (log: Rebuilt suspended tab state ...).
9. Suggestions populate after inactivity (manually modify times or wait >5 min).
10. Removing whitelist entry updates list and saves without errors (CSP safe).

---

## 9. Common Issues & Fixes

| Issue                                 | Cause                               | Fix                                            |
| ------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| Suspended tabs "lost" after reload    | In-memory set cleared               | Rebuild logic (already implemented)            |
| Remove button not working             | CSP blocked inline handler          | Refactored to programmatic listeners           |
| Whitelist not matching                | Prefix logic only                   | Add exact starting substring or extend matcher |
| Group suspend leaves active tab blank | No fallback tab available           | We create a new inactive tab before switching  |
| Notifications missing                 | Notifications permission or blocked | Check chrome://settings/content/notifications  |

---

## 10. Logging & Debugging

Open `chrome://extensions/` → Enable **Developer mode** → Click **service worker** link under the extension to view logs.
Helpful temporary logs exist in `background.js` (e.g., context menu clicks, suspension events, reconstruction message).

Add targeted `console.debug()` for deeper tracing (remove before release if noisy).

---

## 11. Potential Enhancements (Roadmap)

| Priority | Enhancement                                    | Notes                                                                  |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| High     | Wildcard / regex whitelist                     | Convert simple prefix into optional glob or RegExp engine.             |
| High     | Session-based persistence of original metadata | Store original title/favicon in storage for reliability.               |
| Medium   | Heuristic tuning                               | Factor in tab age, memory domain weights, CPU usage (where available). |
| Medium   | Partial suspend modes                          | Freeze vs discard vs full unload (where APIs permit).                  |
| Medium   | Dark mode UI                                   | Toggle CSS variable theme.                                             |
| Low      | Telemetry (opt-in)                             | Anonymous stats for improvements (ensure privacy).                     |
| Low      | Keyboard shortcuts config                      | Add options page for remapping commands.                               |

---

## 12. Extending the Code

### Add a New Context Menu Action

1. In `setupContextMenus()`, add `chrome.contextMenus.create({ id: 'my-new-action', ... })`.
2. Handle it in `handleContextMenuClick` switch.
3. If popup needs it, send message from `popup.js` via `chrome.runtime.sendMessage({ action: 'myNewAction' })` and add a case in `handleMessage`.

### Add a New Setting

1. Add default field to `this.settings` in `background.js` & `options.js`.
2. Update UI (HTML + binding code in `options.js`).
3. Persist automatically via existing save logic.
4. Use it inside suspension heuristics or guard clauses.

### Improve Memory Estimation

Edit `estimateTabMemory` in both `popup.js` (for display) and `background.js` (if used for ranking) to maintain parity.

---

## 13. Versioning & Release

Suggested semantic versioning:

-   MAJOR: Breaking storage schema or behavior.
-   MINOR: New features.
-   PATCH: Bug fixes / performance.

Before tagging a release:

-   Run manual checklist (Section 8)
-   Update `README.md` changelog
-   Increment `manifest.json` version.

---

## 14. Privacy & Security Notes

-   No remote calls – all logic local.
-   Avoid storing sensitive tokens in whitelist (treat it as plain text).
-   If adding analytics later, make it explicit, opt-in, and documented.

---

## 15. Support Workflow

1. Ask user to open `chrome://extensions/`, copy console logs from service worker.
2. Collect reproduction steps + screenshot of popup / options.
3. Check version in `manifest.json` vs repository.
4. Validate settings object from `chrome.storage.sync.get`.

---

## 16. FAQ

**Q: Why did a tab immediately restore after suspension?**  
A: Some pages (e.g., internal Chrome pages) cannot be replaced or are whitelisted.

**Q: Why is a tab not being suspended?**  
A: It might be active, audible, whitelisted, or in an excluded group.

**Q: Can I suspend pinned tabs?**  
A: Currently not automatically (heuristics skip them), but you can trigger manual suspension.

---

## 17. License

MIT – see `LICENSE`.

---

## 18. Contact / Contribution

Open an issue or pull request with:

-   Clear description
-   Steps to reproduce (if bug)
-   Proposed change (if feature)
-   Screenshots (UI changes)

---

**Build smart. Stay fast. Suspend responsibly.**
