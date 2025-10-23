# 🎨 Ads Blocker - Visual Architecture & Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    BrowserGuard Pro Extension                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Background Service Worker (background.js)         │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  AdsBlocker Module (Core Logic)                     │  │  │
│  │  │  ├─ setupBlockingRules()                           │  │  │
│  │  │  ├─ recordBlockedRequest()                         │  │  │
│  │  │  ├─ toggleBlocking()                               │  │  │
│  │  │  ├─ addToWhitelist()                               │  │  │
│  │  │  ├─ addCustomFilter()                              │  │  │
│  │  │  └─ getDashboardData()                             │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  Message Handlers:                                        │  │
│  │  ├─ get-ads-blocker-data → AdsBlocker.getDashboardData() │  │
│  │  ├─ update-ads-blocker-settings → updateSettings()       │  │
│  │  ├─ add-ads-whitelist → addToWhitelist()                 │  │
│  │  ├─ remove-ads-whitelist → removeFromWhitelist()         │  │
│  │  ├─ add-ads-custom-filter → addCustomFilter()            │  │
│  │  ├─ remove-ads-custom-filter → removeCustomFilter()      │  │
│  │  ├─ reset-ads-stats → resetStats()                       │  │
│  │  ├─ export-ads-filters → exportFilters()                 │  │
│  │  ├─ import-ads-filters → importFilters()                 │  │
│  │  └─ toggle-ads-blocker → toggleBlocking()                │  │
│  │                                                            │  │
│  │  Context Menus:                                           │  │
│  │  └─ "Open Ads Blocker Dashboard" → Opens dashboard       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            UI Layer - User Interfaces                     │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  1. Popup Interface                                       │  │
│  │     ├─ "🚫 Ads Blocker Dashboard" button                 │  │
│  │     └─ Connects to Dashboard Tab                         │  │
│  │                                                            │  │
│  │  2. Options Page                                          │  │
│  │     ├─ "🚫 Ads Blocker" tab                             │  │
│  │     ├─ Enable/Disable toggle                             │  │
│  │     ├─ Category toggles (6 types)                        │  │
│  │     ├─ Whitelist manager                                 │  │
│  │     ├─ Custom filters textarea                           │  │
│  │     └─ Dashboard link                                    │  │
│  │                                                            │  │
│  │  3. Dashboard (Separate Tab)                             │  │
│  │     ├─ Overview Tab                                      │  │
│  │     │  ├─ Status indicator                               │  │
│  │     │  ├─ Statistics cards (Total, Session, Data)       │  │
│  │     │  ├─ Performance metrics                            │  │
│  │     │  └─ Top blocked domains                            │  │
│  │     │                                                    │  │
│  │     ├─ Settings Tab                                      │  │
│  │     │  ├─ Enable/Disable                                │  │
│  │     │  ├─ Category toggles (6)                          │  │
│  │     │  └─ Advanced options                              │  │
│  │     │                                                    │  │
│  │     ├─ Whitelist Tab                                     │  │
│  │     │  ├─ Add domain input                              │  │
│  │     │  └─ Domain list                                   │  │
│  │     │                                                    │  │
│  │     └─ Filters Tab                                       │  │
│  │        ├─ Add filter input                              │  │
│  │        └─ Filter list                                   │  │
│  │                                                            │  │
│  │  4. Context Menu                                          │  │
│  │     └─ Right-click → \"Open Ads Blocker Dashboard\"       │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │             Storage Layer (Chrome Storage)                │  │
│  │  ├─ adsBlockerSettings                                   │  │
│  │  ├─ adsBlockerStats                                      │  │
│  │  └─ (Synced via chrome.storage.local)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Blocking Layer (Chrome APIs)                       │  │
│  │  ├─ declarativeNetRequest                                │  │
│  │  │  ├─ Creates blocking rules                            │  │
│  │  │  ├─ Intercepts requests                               │  │
│  │  │  └─ Blocks matching patterns                          │  │
│  │  └─ contextMenus                                          │  │
│  │     └─ Adds right-click menu item                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                ↓
                    ┌───────────────────────┐
                    │   Web Browser         │
                    │   ├─ Ad Requests ❌  │
                    │   ├─ Tracker Calls ❌│
                    │   ├─ Page Content ✅  │
                    │   └─ Stats Updated    │
                    └───────────────────────┘
```

## Data Flow Diagram

```
User Action          Background        Storage           UI Update
───────────          ──────────        ───────           ──────────

1. Open Dashboard
   │
   └──→ chrome.runtime.sendMessage()
        action: "get-ads-blocker-data"
        │
        └──→ AdsBlocker.getDashboardData()
             │
             └──→ Return { settings, stats, topBlockedDomains }
                  │
                  └──→ Dashboard receives data
                       │
                       └──→ updateUI() → Display stats

2. Toggle Category
   │
   └──→ chrome.runtime.sendMessage()
        action: "update-ads-blocker-settings"
        │
        └──→ AdsBlocker.updateSettings()
             │
             ├──→ Save to chrome.storage.local
             │
             ├──→ setupBlockingRules() (recreate rules)
             │
             └──→ Return success
                  │
                  └──→ UI updates toggle state

3. Website Visit
   │
   └──→ Browser makes ad request
        │
        └──→ declarativeNetRequest intercepts
             │
             ├──→ Matches against blocking rules
             │
             ├──→ Request blocked if match
             │
             └──→ AdsBlocker.recordBlockedRequest()
                  │
                  ├──→ Increment stats
                  │
                  └──→ Save to chrome.storage.local
                       │
                       └──→ Dashboard auto-refresh picks it up

4. Add to Whitelist
   │
   └──→ chrome.runtime.sendMessage()
        action: "add-ads-whitelist"
        domain: "example.com"
        │
        └──→ AdsBlocker.addToWhitelist()
             │
             ├──→ Add to settings.whitelistedDomains
             │
             ├──→ Save to chrome.storage.local
             │
             ├──→ setupBlockingRules() (recreate)
             │
             └──→ Return success
                  │
                  └──→ UI refreshes whitelist display
                       Ads for example.com now visible
```

## Component Hierarchy

```
AdsBlocker
├── Settings
│   ├── enabled: boolean
│   ├── blockAds: boolean
│   ├── blockAnalytics: boolean
│   ├── blockBanners: boolean
│   ├── blockPopups: boolean
│   ├── blockCookieTrackers: boolean
│   ├── blockSocialWidgets: boolean
│   ├── customFilters: string[]
│   └── whitelistedDomains: string[]
│
├── Statistics
│   ├── totalBlocked: number
│   ├── sessionBlocked: number
│   ├── dataBlockedMB: number
│   ├── blockedByDomain: { [domain]: count }
│   └── blockedByType: { ads, analytics, banners, cookies, popups, social }
│
├── FilterLists
│   ├── ads: string[] (350+ patterns)
│   ├── analytics: string[] (200+ patterns)
│   ├── banners: string[] (50+ patterns)
│   ├── cookieTrackers: string[] (40+ patterns)
│   ├── popups: string[] (20+ patterns)
│   └── socialMedia: string[] (30+ patterns)
│
└── Methods
    ├── init()
    ├── setupBlockingRules()
    ├── generateRules()
    ├── recordBlockedRequest()
    ├── toggleBlocking()
    ├── updateSettings()
    ├── addToWhitelist()
    ├── removeFromWhitelist()
    ├── addCustomFilter()
    ├── removeCustomFilter()
    ├── resetStats()
    ├── getDashboardData()
    ├── getTopBlockedDomains()
    ├── exportFilters()
    ├── importFilters()
    ├── loadSettings()
    ├── saveSettings()
    ├── loadStats()
    └── saveStats()
```

## User Interaction Flow

```
┌─────────────────┐
│  User Opens     │
│  Browser Tab    │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Access Ads Blocker - 3 Methods:    │
└──────────────────────────────────────┘
         │
    ┌────┼────┬─────────────┐
    │    │    │             │
    ▼    ▼    ▼             ▼
  Popup Context Settings Dashboard
  Button  Menu   Page      (Direct)
    │      │      │          │
    └──────┴──────┴──────────┘
         │
         ▼
  ┌─────────────────┐
  │  Dashboard      │
  │   Opens Tab     │
  └────────┬────────┘
           │
    ┌──────┴──────┬─────────┬──────────┐
    │             │         │          │
    ▼             ▼         ▼          ▼
 Overview    Settings   Whitelist   Filters
 Tab         Tab         Tab         Tab
    │             │         │          │
    │      ┌──────┴─────┐   │      ┌──┴──┐
    │      │            │   │      │     │
    ▼      ▼            ▼   ▼      ▼     ▼
 Stats  Toggles     Manage  Add/Rm Add  Remove
 Cards  Categories  Domains Filters Filter
    │      │         │       │      │    │
    └──────┴─────────┴───────┴──────┴────┘
           │
           ▼
  Background Service Worker
  Updates Settings/Stats
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
 Chrome       Re-create
 Storage       Blocking
 Updated      Rules
    │             │
    └─────────────┘
         │
         ▼
  Pages Load with
  Ads Blocked
```

## Filter Application Process

```
User Visits Website
        │
        ├─→ Browser loads page
        │
        └─→ Page requests resources:
            ├─ Scripts
            ├─ Images
            ├─ CSS
            ├─ Ads
            ├─ Analytics
            └─ ...
                │
                ▼
        declarativeNetRequest checks each:
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
    URL matches    URL doesn't
    blocking rule   match rules
        │               │
        ▼               ▼
    REQUEST         REQUEST
    BLOCKED         ALLOWED
        │               │
        │               └─→ Load resource
        │                   (ad/tracker appears)
        │
        └─→ Request canceled
            (resource never loads)
                │
                ▼
        AdsBlocker.recordBlockedRequest()
                │
        ┌───────┴──────────┐
        │                  │
        ▼                  ▼
    Update Stats      Save to
    (in memory)       Storage
        │
        └─→ Every 100 blocks:
            Save stats to disk
                │
                ▼
        Dashboard auto-refresh
        picks up new stats
```

## Settings Sync Flow

```
User Makes Change
    │
    ├─→ Options Page
    │   └─→ Modify toggle
    │       │
    │       └─→ chrome.runtime.sendMessage()
    │           └─→ Background updates
    │               └─→ Saved to Storage
    │                   │
    │                   ├─→ Dashboard refreshes
    │                   │   (if open)
    │                   │
    │                   └─→ Blocking rules
    │                       recreated
    │
    ├─→ Dashboard
    │   └─→ Modify toggle
    │       │
    │       └─→ chrome.runtime.sendMessage()
    │           └─→ Background updates
    │               └─→ Saved to Storage
    │                   │
    │                   ├─→ Options page
    │                   │   refreshes (if open)
    │                   │
    │                   └─→ Blocking rules
    │                       recreated
    │
    └─→ Popup (limited controls)
        └─→ Would connect to both
            above systems

All Systems: Options ↔ Storage ↔ Dashboard ↔ Background
              (Always Synchronized)
```

## Event Listener Map

```
Dashboard Listeners:
├─ #ads-blocker-toggle (on/off)
│  └─→ update-ads-blocker-settings
│
├─ .setting-toggle[] (category toggles)
│  └─→ update-ads-blocker-settings
│
├─ #add-ads-whitelist (add domain button)
│  └─→ add-ads-whitelist
│
├─ .remove-ads-whitelist[] (remove buttons)
│  └─→ remove-ads-whitelist
│
├─ #add-ads-custom-filter (add filter button)
│  └─→ add-ads-custom-filter
│
├─ .remove-custom-filter[] (remove buttons)
│  └─→ remove-ads-custom-filter
│
├─ #reset-stats-btn (reset statistics)
│  └─→ reset-ads-stats
│
├─ #export-stats-btn (export statistics)
│  └─→ trigger download
│
├─ #export-filters-btn (export filters)
│  └─→ export-ads-filters
│
├─ #import-filters-btn (import filters)
│  └─→ import-ads-filters
│
└─ Auto-refresh timer
   └─→ get-ads-blocker-data (every 5s)

Options Listeners:
├─ #ads-blocker-enabled (main toggle)
│  └─→ update-ads-blocker-settings
│
├─ .setting-toggle[] (6 category toggles)
│  └─→ update-ads-blocker-settings
│
├─ #add-ads-whitelist (add domain)
│  └─→ add-ads-whitelist
│
├─ #ads-whitelist-url (text input)
│  └─→ User typing
│
└─ #open-ads-dashboard (button)
   └─→ chrome.tabs.create() → dashboard tab

Popup Listeners:
└─ #ads-blocker-btn (dashboard button)
   └─→ chrome.tabs.create() → dashboard tab

Context Menu Listener:
└─ page-ads-blocker (context menu click)
   └─→ chrome.tabs.create() → dashboard tab
```

## Statistics Collection Flow

```
Request made by webpage
        │
        ▼
declarativeNetRequest
checks rules
        │
    ┌───┴───┐
    │       │
   ✅      ❌
  (allow) (block)
    │       │
    │       ▼
    │   recordBlockedRequest()
    │        │
    │   ┌────┴────┐
    │   │         │
    │   ▼         ▼
    │  Track  Track by
    │  by DOM  Type
    │  ain     │
    │   │     (ads, analytics, etc.)
    │   │      │
    │   ├──────┤
    │   │      │
    │   ▼      ▼
    │  Update totals
    │  ├─ totalBlocked++
    │  ├─ sessionBlocked++
    │  ├─ dataBlockedMB += 0.05
    │  └─ Save every 100
    │
    └──────────→ (no tracking for allowed)
           │
           ▼
    Stats stored in memory
           │
           ▼
    Auto-save to chrome.storage
    (every 100 blocks or on close)
           │
           ▼
    Dashboard retrieves and displays:
    ├─ Total stats
    ├─ Category breakdown
    ├─ Top domains
    └─ Data saved estimate
```

---

This visual documentation helps understand how the Ads Blocker integrates with BrowserGuard Pro! 🎨
