# Sync Across Devices Feature - Complete Technical Analysis

## Overview

**"Sync Across Devices"** is a feature that enables automatic synchronization of Tab Suspend Pro settings and data across all Chrome installations where you're signed in with the same Google account.

This feature leverages **Chrome's built-in `chrome.storage.sync` API**, which is Chrome's native mechanism for keeping extension data synchronized across devices.

---

## What This Feature Does

### Primary Functionality

-   **Settings Synchronization**: All Tab Suspend Pro settings (suspender configuration, privacy settings, tracker blocker rules, etc.) are automatically synced to other Chrome installations
-   **Cross-Device Consistency**: When you change a setting on one device, it automatically propagates to other devices
-   **Automatic Sync**: Works seamlessly in the background without user intervention (once enabled)
-   **Account-Based**: Syncs only when you're signed into the same Google account across devices

### What Gets Synced

According to `cloud-backup.js` (lines 274-290), the sync includes:

```javascript
// From collectBackupData() method:
{
    metadata: {
        version: "2.1.0",
        timestamp: Date.now(),
        source: "BrowserGuard Pro",
        browser: navigator.userAgent,
    },
    settings: syncStorage,  // All chrome.storage.sync data
    data: {
        sessions: localStorage.sessionHistory || [],
        analytics: localStorage.activityHeatmap || {},
        siteStats: localStorage.siteStats || {},
        savedGroups: localStorage.savedTabGroups || {},
        performanceHistory: localStorage.performanceHistory || [],
        sessionTemplates: localStorage.sessionTemplates || {},
    },
}
```

---

## UI Implementation

### Location

File: `ui/options/options.html` (line ~905)

```html
<label class="sync-toggle-label">
    <input type="checkbox" id="sync-toggle" class="sync-toggle" />
    <span class="toggle-label"
        >Sync settings across all your Chrome installations</span
    >
</label>
```

### Visual Interface

-   **Toggle Control**: Simple checkbox/toggle switch in the options page
-   **Label**: "Sync settings across all your Chrome installations"
-   **Element ID**: `#sync-toggle`

---

## How It Currently Works

### 1. **UI Initialization** (options.js, lines 1514-1518)

```javascript
// When options page loads, attach event listener to sync toggle
const syncToggle = document.getElementById("sync-toggle");
if (syncToggle) {
    syncToggle.addEventListener("click", () => this.toggleSync());
}
```

### 2. **Toggle Handler** (options.js, lines 1703-1716)

```javascript
async toggleSync() {
    // This enables Chrome's built-in sync
    try {
        const syncEnabled = !this.settings.syncEnabled;
        this.settings.syncEnabled = syncEnabled;
        await this.saveSettings();

        const syncToggle = document.getElementById("sync-toggle");
        if (syncToggle) {
            syncToggle.classList.toggle("active", syncEnabled);
        }

        this.showStatusMessage(
            syncEnabled ? "Chrome sync enabled!" : "Chrome sync disabled!",
            "success"
        );
    } catch (error) {
        // error handling
    }
}
```

### 3. **Settings Storage** (options.js)

When `saveSettings()` is called, it stores settings using:

```javascript
await chrome.storage.sync.set({
    cloudSyncSettings: this.syncSettings,
});
```

This automatically syncs the data to Chrome's server for other signed-in devices.

### 4. **Loading Sync Status on Startup** (options.js, lines 99-120)

```javascript
async loadCloudSyncStatus() {
    try {
        const response = await this.sendMessageSafely({
            action: "cloud-get-status",
        });

        if (response?.success && response.status) {
            const driveToggle = document.getElementById("google-drive-toggle");
            if (
                driveToggle &&
                response.status.enabled &&
                response.status.provider === "google-drive"
            ) {
                driveToggle.classList.add("active");
            }
        }
    } catch (error) {
        console.error("Failed to load cloud sync status:", error);
    }
}
```

---

## Technical Architecture

### Two Storage Systems

The extension uses **two distinct storage mechanisms**:

#### 1. **chrome.storage.sync** (Cloud-Synced)

**What it does:** Chrome automatically syncs this data across all devices
**Used for:** Settings that should persist across devices
**Quota:** 102,400 bytes per item, 10 MB total
**Sync behavior:** Automatic, happens in background
**Requirements:** User must be signed into Chrome

**Example:**

```javascript
await chrome.storage.sync.set({
    cloudSyncSettings: {
        enabled: true,
        provider: "google-drive",
        autoSync: true,
        syncInterval: "daily",
    },
});
```

#### 2. **chrome.storage.local** (Local-Only)

**What it does:** Stores data only on the current device
**Used for:** Device-specific data (session history, OAuth tokens)
**Quota:** 10 MB
**Sync behavior:** None - stays local
**Example:**

```javascript
// Stored only on this device
await chrome.storage.local.set({
    "google-drive_token": tokenData,
    sessionHistory: [...],
    siteStats: {...}
});
```

### Storage Permissions

From `manifest.json`:

```json
"permissions": [
    "storage",
    "unlimitedStorage"
]
```

These permissions allow:

-   Full access to `chrome.storage.sync` and `chrome.storage.local`
-   Unlimited storage quota (instead of typical 5 MB limit)

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Tab Suspend Pro                           │
│                 OPTIONS PAGE (options.js)                    │
└────────────────┬────────────────────────────────────────────┘
                 │ User clicks sync toggle
                 ▼
         ┌──────────────────┐
         │  toggleSync()    │
         └────────┬─────────┘
                  │
                  ├─► Update this.settings.syncEnabled
                  ├─► Call saveSettings()
                  └─► Update UI with toggle state

                  ▼
         ┌──────────────────────────────────────┐
         │  await chrome.storage.sync.set({     │
         │    cloudSyncSettings: {...}          │
         │  })                                  │
         └────────────────┬─────────────────────┘
                          │
                          ▼ Chrome's automatic sync

    ┌────────────────────────────────────────────┐
    │   CHROME SYNC SERVER                       │
    │   (Google Account Integration)             │
    └────────────────────────────────────────────┘
                    │
          ┌─────────┴─────────┬─────────────┐
          ▼                   ▼             ▼
    ┌──────────┐        ┌──────────┐  ┌──────────┐
    │ Device 1 │        │ Device 2 │  │ Device 3 │
    │ (Chrome) │        │ (Chrome) │  │ (Chrome) │
    │ Synced   │        │ Synced   │  │ Synced   │
    └──────────┘        └──────────┘  └──────────┘
```

---

## CloudBackupManager Integration

The `CloudBackupManager` class (src/modules/cloud-sync/cloud-backup.js) has methods that work with chrome.storage.sync:

### Loading Sync Settings (lines 23-34)

```javascript
async loadSyncSettings() {
    try {
        const data = await chrome.storage.sync.get(["cloudSyncSettings"]);
        if (data.cloudSyncSettings) {
            this.syncSettings = {
                ...this.syncSettings,
                ...data.cloudSyncSettings,
            };
        }
    } catch (error) {
        console.error("Error loading sync settings:", error);
    }
}
```

### Saving Sync Settings (lines 36-44)

```javascript
async saveSyncSettings() {
    try {
        await chrome.storage.sync.set({
            cloudSyncSettings: this.syncSettings,
        });
    } catch (error) {
        console.error("Error saving sync settings:", error);
    }
}
```

### Getting Sync Status (lines 571-580)

```javascript
getSyncStatus() {
    return {
        enabled: this.syncSettings.enabled,
        provider: this.syncSettings.provider,
        lastSync: this.syncSettings.lastSync,
        autoSync: this.syncSettings.autoSync,
        syncInterval: this.syncSettings.syncInterval,
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
    };
}
```

---

## Service Worker Message Handlers

From `background.js` (lines 1609-1649), the service worker handles sync-related messages:

```javascript
case "cloud-get-status":
    // Returns current sync configuration
    return {
        success: true,
        status: this.cloudBackup.getSyncStatus()
    };

case "cloud-authenticate":
    // Initiates OAuth flow with cloud provider
    return await this.cloudBackup.authenticateProvider(message.provider);

case "cloud-disable-sync":
    // Disables sync and clears alarms
    return await this.cloudBackup.disableSync();

case "cloud-manual-backup":
    // Manually trigger backup
    return await this.cloudBackup.performBackup();
```

---

## Safe Message Communication

The options page uses `sendMessageSafely()` to handle service worker communication with retry logic:

```javascript
async sendMessageSafely(message, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await chrome.runtime.sendMessage(message);
        } catch (error) {
            if (i < retries - 1) {
                // Exponential backoff: 100ms, 200ms, 400ms
                await new Promise(resolve =>
                    setTimeout(resolve, 100 * Math.pow(2, i))
                );
            }
        }
    }
    throw new Error("Message delivery failed after retries");
}
```

This ensures that even if the service worker has temporarily terminated (MV3 limitation), the message will be retried.

---

## Current Implementation Status

### ✅ Implemented

-   [x] UI toggle for sync control
-   [x] Local state management (this.settings.syncEnabled)
-   [x] chrome.storage.sync integration
-   [x] Message handlers in background service worker
-   [x] Status loading on page initialization
-   [x] Safe message communication with retry logic

### ⚠️ Partially Implemented

-   [ ] **Auto-sync scheduling** - Has `setupSyncSchedule()` method but not connected to toggle
-   [ ] **Sync status display** - Shows in CloudBackupManager but not displayed to user in UI
-   [ ] **Conflict resolution** - No handling for conflicting sync data from multiple devices
-   [ ] **Offline queue** - Settings are not queued if offline

### ❌ Not Implemented

-   [ ] **Sync history** - No log of what has been synced
-   [ ] **Selective sync** - Can't choose which settings to sync
-   [ ] **Bandwidth control** - No throttling or data compression
-   [ ] **User feedback** - No visual indicator when sync is active

---

## How Chrome.storage.sync Works

### Behind the Scenes

1. **User signs in to Chrome** with their Google account
2. **Extension data stored in chrome.storage.sync** is automatically uploaded to Google's servers
3. **On another device** with the same Google account signed in, the data is automatically downloaded
4. **Changes are bidirectional** - updates on Device A sync to Device B and vice versa
5. **Automatic conflict resolution** - Last-write-wins strategy (latest change takes precedence)

### Sync Reliability

-   **Automatic**: Works without extension involvement after initial setup
-   **Encrypted in transit**: Uses HTTPS to Google servers
-   **Account-based**: Only syncs between devices using the same Google account
-   **Offline-compatible**: Local changes are queued and synced when online

### Limitations

-   **10 MB total quota** for all synced data
-   **102,400 bytes per item** maximum size
-   **Doesn't work offline** - changes queued but not synced until online
-   **Merge conflicts**: Uses last-write-wins (can lose data in multi-device edits)
-   **Requires Chrome sign-in**: Must be logged in to Google account in Chrome

---

## Example Usage Scenario

### Scenario: Enabling Sync Across Devices

**Device 1 (Laptop):**

1. Open Tab Suspend Pro options
2. Toggle "Sync Across Devices" ON
3. System stores `syncEnabled: true` in chrome.storage.sync
4. Chrome uploads to sync server

**Device 2 (Desktop):**

1. Open Tab Suspend Pro options
2. Options page loads
3. `loadCloudSyncStatus()` is called
4. Service worker receives `cloud-get-status` message
5. Returns sync status from CloudBackupManager
6. UI displays that sync is enabled

**Device 3 (Phone/Tablet):**

1. Chrome syncs the settings automatically
2. When Tab Suspend Pro is opened, settings are already synced
3. Same configuration as Device 1 and Device 2

---

## Potential Issues and Improvements

### Current Issues

1. **No visual sync indicator** - User doesn't know when data is syncing
2. **No error handling for quota exceeded** - If backup data exceeds 10 MB limit
3. **Conflict resolution is silent** - User doesn't see what changed
4. **Auto-sync is disabled by default** - Manual sync only unless provider is set

### Recommended Improvements

1. **Add sync status indicator**

    ```javascript
    // Show syncing animation while in progress
    document.getElementById("sync-status").textContent = "Syncing...";
    ```

2. **Implement sync history UI**

    - Show last sync time
    - Display what was synced
    - Allow manual sync trigger

3. **Add conflict detection**

    - Detect when multiple devices edit same settings
    - Show merge dialog
    - Option to keep local or remote version

4. **Implement bandwidth control**

    - Compress data before sync
    - Throttle sync frequency
    - Manual sync option

5. **Better error handling**
    ```javascript
    if (backupSize > 10485760) {
        showError("Backup data exceeds 10 MB limit. Remove some data.");
    }
    ```

---

## File References

### Core Implementation Files

| File                                     | Lines     | Purpose                      |
| ---------------------------------------- | --------- | ---------------------------- |
| `ui/options/options.html`                | ~905      | UI toggle element            |
| `ui/options/options.js`                  | 1514-1716 | Toggle handler, sync control |
| `src/modules/cloud-sync/cloud-backup.js` | 1-608     | CloudBackupManager class     |
| `background.js`                          | 1609-1649 | Message handlers for sync    |

### Related Files

| File                   | Purpose                 |
| ---------------------- | ----------------------- |
| `manifest.json`        | Storage permissions     |
| `ui/options/sections/` | Other settings sections |
| `src/core/`            | Core extension logic    |

---

## Technical Summary

**"Sync Across Devices"** is a feature that:

1. **Leverages**: Chrome's native `chrome.storage.sync` API
2. **Requires**: User to be signed in to the same Google account
3. **Syncs**: All settings and data automatically across devices
4. **Uses**: Service worker message handlers for control
5. **Implements**: Safe message communication with retry logic
6. **Stores locally**: OAuth tokens and device-specific data remain local
7. **Works by**: Automatically uploading/downloading data to/from Chrome sync servers

The implementation is **partially complete** with core infrastructure in place but some features (auto-sync scheduling, conflict resolution, user feedback) not fully integrated.

---

## Chrome API Documentation References

-   **chrome.storage.sync**: https://developer.chrome.com/docs/extensions/reference/storage/
-   **Manifest V3 Storage**: https://developer.chrome.com/docs/extensions/mv3/storage-and-cookies/
-   **Service Worker Lifecycle**: https://developer.chrome.com/docs/extensions/mv3/service_workers/lifecycle/
