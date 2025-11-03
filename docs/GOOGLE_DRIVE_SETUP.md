# Google Drive Backup Setup Guide

## Current Status

The Google Drive backup feature is **partially implemented** but requires Google Cloud OAuth credentials to function.

## Why It's Not Working

The code currently uses a placeholder client ID:

```javascript
const clientId = "your-google-client-id";
```

This needs to be replaced with actual Google Cloud credentials.

## How to Enable Google Drive Backup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name it something like "BrowserGuard Pro Backup"

### Step 2: Enable Google Drive API

1. In your project, go to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in required fields:
    - **App name**: BrowserGuard Pro
    - **User support email**: Your email
    - **Developer contact**: Your email
4. Add scopes:
    - `https://www.googleapis.com/auth/drive.file` (View and manage files created by this app)
5. Add your email as a test user
6. Save and continue

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Choose application type: **Chrome Extension**
4. Name: "BrowserGuard Pro Extension"
5. Get your Extension ID:
    - Go to `chrome://extensions`
    - Enable Developer mode
    - Your extension ID is shown under the extension name
    - Example: `abcdefghijklmnopqrstuvwxyz123456`
6. Enter Application ID: `<your-extension-id>`
7. Click **Create**
8. Copy your **Client ID** (it will look like: `123456789-abc123def456.apps.googleusercontent.com`)

### Step 5: Update Extension Code

Edit `src/modules/cloud-sync/cloud-backup.js`:

```javascript
async getGoogleDriveAuthUrl() {
    // Replace with your actual Google Client ID
    const clientId = "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com";
    const redirectUri = chrome.identity.getRedirectURL();
    const scope = "https://www.googleapis.com/auth/drive.file";

    return (
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=token&` +
        `access_type=offline`
    );
}
```

### Step 6: Update Token Exchange

You'll also need to update the `exchangeCodeForToken` method in the same file to properly exchange authorization codes for access tokens. This requires:

1. Your Client ID
2. Your Client Secret (from Google Cloud Console)
3. Proper token exchange API call

### Step 7: Reload Extension

1. Go to `chrome://extensions`
2. Click the reload button on your extension
3. Open extension options
4. Try enabling Google Drive backup
5. You should see a Google OAuth consent screen

## Alternative: Use Chrome Storage Sync

If you don't want to set up Google OAuth, you can use Chrome's built-in sync instead:

1. In the extension options, under "Cloud Backup & Sync"
2. Enable **"Chrome Sync"** instead of Google Drive
3. This will sync your settings across all Chrome browsers where you're signed in
4. No additional setup required!

## Current Implementation Status

### ✅ What's Implemented:

-   Google Drive authentication flow structure
-   OAuth URL generation
-   Token storage mechanism
-   Backup data preparation
-   File upload to Google Drive
-   Download and restore from Google Drive
-   Automatic sync scheduling
-   Manual backup trigger

### ⚠️ What's Missing:

-   Actual Google Client ID (placeholder only)
-   Token exchange implementation (needs client secret)
-   Token refresh mechanism
-   Error handling for expired tokens

### 🔧 What Needs Configuration:

-   Google Cloud Project setup
-   OAuth credentials creation
-   Client ID in code
-   Client Secret in code (for token exchange)

## Security Notes

**Important**: Never commit your Google Client Secret to version control!

Options for secure storage:

1. Use environment variables during build
2. Store in Chrome storage (encrypted)
3. Use Chrome's identity API without client secret (implicit flow)

## Testing

Once configured, test the feature:

1. Enable Google Drive backup in options
2. You should see Google's OAuth consent screen
3. Grant permissions
4. Check if toggle stays enabled
5. Click "Backup Now" to test manual backup
6. Check Google Drive for backup file
7. Try restoring from backup

## Troubleshooting

### "Authentication failed"

-   Check if Client ID is correct
-   Verify OAuth consent screen is configured
-   Make sure you're added as a test user

### "Not configured" error

-   Client ID still has placeholder value
-   Update the code with your actual Client ID

### "Token expired"

-   Token refresh not implemented yet
-   Re-authenticate by toggling off and on

### Backup file not appearing in Google Drive

-   Check Drive API is enabled
-   Verify scopes are correct
-   Look in "Apps" folder in Google Drive

## For Development

If you want to fully implement this feature:

1. Complete the OAuth setup above
2. Implement proper token exchange in `exchangeCodeForToken()`
3. Add token refresh logic
4. Test thoroughly
5. Consider publishing to Chrome Web Store for easier OAuth setup

## Estimated Time to Set Up

-   Google Cloud setup: 15-20 minutes
-   Code updates: 10-15 minutes
-   Testing: 10 minutes
-   **Total: ~45 minutes**

## Need Help?

If you encounter issues:

1. Check browser console for errors
2. Verify all Google Cloud settings
3. Ensure extension ID matches OAuth credentials
4. Test with a simple OAuth flow first

---

**Current Status**: Feature exists but needs OAuth credentials to activate.
**Workaround**: Use Chrome Sync toggle instead (works immediately, no setup).
