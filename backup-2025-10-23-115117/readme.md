# Tab Suspender Pro 💤⚡

A comprehensive Chrome extension with advanced tab management, analytics, and productivity features. Save up to 80% memory usage while boosting your browser performance with intelligent automation and detailed insights.

## 🌟 Core Features

### 💤 Smart Tab Suspension

-   **Right-click Context Menu**: Suspend individual tabs or entire tab groups with a simple right-click
-   **Automatic Suspension**: Configure tabs to auto-suspend after a specified period of inactivity
-   **Intelligent Suggestions**: AI-powered recommendations on which tabs to suspend for maximum memory savings
-   **Beautiful Suspended Page**: Elegant suspended page with one-click restoration

### 📋 Advanced Session Management

-   **Session Snapshots**: Save complete browser sessions (all windows + tabs) with timestamps
-   **Session Scheduler**: Auto-save sessions at daily/weekly intervals
-   **Session Templates**: Create reusable session templates for different workflows (work, research, etc.)
-   **Cloud Session Sync**: Sync sessions across devices via Google Drive/Dropbox _(coming soon)_

### 🗂️ Smart Tab Organization

-   **Auto-Grouping**: Automatically group tabs by domain, content type, or time opened
-   **Tab Stacking**: Stack related tabs to reduce visual clutter
-   **Workspace Profiles**: Switch between different tab configurations (Personal, Work, Research)
-   **Tab Bookmarking**: Convert tab groups to organized bookmark folders

### 📊 Memory & Performance Analytics

-   **Memory Dashboard**: Detailed charts showing memory usage over time
-   **Performance Insights**: Track CPU usage, network activity per tab
-   **Suspension Analytics**: Statistics on suspension frequency, memory saved, patterns
-   **Browser Health Score**: Overall browser performance rating (0-100)

### � Tab Activity Analytics

-   **Usage Heatmap**: Visual calendar showing daily tab usage patterns
-   **Most/Least Used Sites**: Statistics on site visit frequency and duration
-   **Productivity Metrics**: Time spent on different categories of sites
-   **Focus Mode**: Block distracting sites, auto-suspend non-work tabs

### 🤖 Intelligent Automation

-   **AI-Powered Suspension**: Machine learning to predict which tabs to suspend _(coming soon)_
-   **Context-Aware Rules**: Different suspension rules based on time of day, activity
-   **Smart Preloading**: Predict and preload tabs you're likely to visit _(coming soon)_
-   **Automatic Cleanup**: Remove duplicate tabs, close abandoned shopping carts _(coming soon)_

### 🛡️ Tracker Blocker (NEW!)

-   **Ad Blocking**: Block advertisements from major ad networks (Google Ads, DoubleClick, etc.)
-   **Tracker Blocking**: Block analytics and tracking scripts (Google Analytics, Facebook Pixel, etc.)
-   **Social Media Blocking**: Block social media widgets and embedded content
-   **Crypto Mining Protection**: Block cryptocurrency mining scripts
-   **Malware Protection**: Block known malicious domains
-   **Custom Filters**: Add your own URL patterns to block
-   **Whitelist Management**: Exclude trusted domains from blocking
-   **Statistics Dashboard**: View blocked requests by category and domain
-   **Import/Export**: Share filter configurations across devices

Similar to uBlock Origin but integrated directly into Tab Suspend Pro!

📖 **[Detailed Tracker Blocker Documentation](TRACKER_BLOCKER_README.md)**

### ⚙️ Advanced Settings

-   **Customizable Timer**: Set suspension time from minutes to hours
-   **Enable/Disable Toggle**: Quickly turn the extension on/off
-   **Tab Group Control**: Choose which tab groups should never be suspended
-   **URL Whitelist**: Exclude specific websites from ever being suspended
-   **Workspace Profiles**: Create custom profiles with different rules and behaviors

## 🚀 Installation

### Method 1: Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store.

### Method 2: Manual Installation (Developer Mode)

1. **Download the Extension**

    - Download all the files or clone this repository
    - Create a new folder for the extension

2. **Enable Developer Mode**

    - Open Chrome and go to `chrome://extensions/`
    - Toggle "Developer mode" in the top right corner

3. **Load the Extension**

    - Click "Load unpacked" button
    - Select the folder containing the extension files
    - The extension should now appear in your extensions list

4. **Pin the Extension**
    - Click the puzzle piece icon in the toolbar
    - Pin "Tab Suspend Pro" for easy access

## 📁 File Structure

```
tab-suspend-pro/
├── manifest.json              # Extension configuration
├── background.js               # Main extension logic & session management
├── popup.html                 # Extension popup interface
├── popup.js                   # Popup functionality & toggle controls
├── options.html               # Settings & backup page
├── options.js                 # Settings functionality & export/import
├── suspended.html             # Suspended tab page
├── suspended.js               # Tab restoration logic
├── content.js                 # Activity tracking & user interaction
├── dashboard.html             # Analytics dashboard
├── dashboard.js               # Performance metrics & charts
├── advanced-options.html      # Advanced configuration
├── session-manager-enhanced.js # Enhanced session management
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── modules/                   # Shared modules
├── README.md                  # User documentation
└── CHANGELOG.md               # Version history & technical changes
```

## 🎮 Usage

### Basic Usage

1. **Right-Click Context Menu**

    - Right-click on any tab or webpage
    - Select "Suspend Tab" to immediately suspend the current tab
    - Select "Suspend Tab Group" to suspend all tabs in the group
    - Select "Restore Tab/Group" to restore suspended tabs

2. **Extension Popup**

    - Click the extension icon in the toolbar
    - Use quick actions to suspend current tab or find suggestions
    - View memory savings statistics
    - Access settings

3. **Automatic Suspension**
    - Configure auto-suspension timer in settings
    - Tabs will automatically suspend after the specified inactive time
    - Audio/video tabs are protected by default

### Advanced Features

#### Tab Group Management

-   Create tab groups in Chrome (right-click tab → "Add to new group")
-   In extension settings, choose which groups to exclude from auto-suspension
-   Perfect for keeping work projects or important tabs always active

#### URL Whitelist

-   Add domains or URL patterns that should never be suspended
-   Examples: `localhost:`, `meet.google.com`, `github.com`
-   Useful for development servers or important web apps

#### Smart Suggestions

-   Click "Find Tabs to Suspend" to get AI-powered recommendations
-   See inactive time and estimated memory usage for each tab
-   One-click suspension from the suggestions list

## ⚡ Performance Benefits

-   **Memory Savings**: Up to 80% reduction in RAM usage per suspended tab
-   **Faster Browser**: Reduced memory pressure improves overall performance
-   **Battery Life**: Lower CPU usage extends laptop battery life
-   **Tab Management**: Handle hundreds of tabs without browser slowdown

## 🛠️ Configuration Options

### General Settings

-   **Enable/Disable**: Toggle extension functionality
-   **Auto-suspend Timer**: Set inactivity threshold (minutes/hours)

### Tab Groups

-   **Exclude Groups**: Prevent specific tab groups from auto-suspension
-   **Group Protection**: Keep important workflows always active

### URL Management

-   **Whitelist URLs**: Protect specific domains from suspension
-   **Pattern Matching**: Use flexible URL patterns

### Advanced Options

-   **Audio Tab Handling**: Choose whether to suspend tabs playing audio
-   **Notifications**: Enable/disable suspension notifications
-   **Aggressive Mode**: More aggressive memory saving (experimental)

## 🔧 Technical Details

### How It Works

1. **Activity Tracking**: Content scripts monitor user interaction with tabs
2. **Smart Detection**: Background service worker tracks tab usage patterns
3. **Memory-Safe Suspension**: Tabs are replaced with lightweight placeholder pages
4. **Instant Restoration**: Clicking suspended tabs immediately restores original content
5. **Context Preservation**: Tab title, favicon, and URL are preserved during suspension

### Permissions Explained

-   `tabs`: Monitor and manage browser tabs
-   `tabGroups`: Handle tab group operations
-   `storage`: Save user preferences and settings
-   `contextMenus`: Add right-click menu options
-   `scripting`: Track user activity for smart suspension

### Privacy & Security

-   **No Data Collection**: Extension works entirely locally
-   **No External Servers**: All processing happens in your browser
-   **Open Source**: Full code transparency
-   **Minimal Permissions**: Only requests necessary browser access

## 🐛 Troubleshooting

### Common Issues

**Extension not working after installation**

-   Ensure Developer Mode is enabled
-   Try reloading the extension in `chrome://extensions/`
-   Check for any error messages in the console

**Tabs not suspending automatically**

-   Verify extension is enabled in popup
-   Check auto-suspend timer settings
-   Ensure tabs aren't in excluded groups or whitelisted URLs

**Suspended tabs not restoring**

-   Click anywhere on the suspended page to restore
-   Use the "Restore Tab" button on the suspended page
-   Check if original URL is still valid

**Context menus not appearing**

-   Right-click directly on webpage content
-   Ensure extension has proper permissions
-   Try refreshing the page

### Advanced Troubleshooting

**Performance Issues**

-   Reduce auto-suspend timer for more aggressive suspension
-   Enable aggressive mode in advanced settings
-   Check Chrome Task Manager for memory usage

**Extension Conflicts**

-   Disable other tab management extensions temporarily
-   Check for conflicts with ad blockers or privacy extensions

## 🔄 Updates & Changelog

### Version 2.0.0 (Latest) - October 4, 2024

#### 🚀 Major Features Added

-   **Extension Toggle Functionality**: Complete enable/disable functionality in popup with visual feedback
-   **Backup & Sync System**: Export/import settings, auto-backup configuration, Chrome sync integration
-   **Advanced Analytics Dashboard**: Comprehensive memory usage tracking, performance insights
-   **Smart Session Management**: Enhanced session snapshots with scheduler and templates

#### 🛠️ Critical Fixes

-   **Duplicate Tab Restoration**: Fixed major issue where browser session restore created duplicate tabs
-   **Button Overlap**: Resolved UI overlap between settings and theme toggle buttons
-   **Group Preservation**: Tab groups now properly maintained after browser restart
-   **Session Restore Detection**: Intelligent detection of Chrome session restoration

#### 🎨 UI/UX Improvements

-   **Glassmorphism Design**: Beautiful glass effect throughout popup and options pages
-   **Enhanced Backgrounds**: Rich gradient backgrounds with layered visual effects
-   **Responsive Layout**: Improved responsive design for all screen sizes
-   **Theme Support**: Enhanced light/dark mode with proper contrast ratios

#### ⚡ Performance Enhancements

-   **Badge Counter**: Real-time display of suspended tabs count in extension badge
-   **Smart Timing**: Delayed initialization to avoid Chrome session restore conflicts
-   **Better Error Handling**: Graceful fallbacks and comprehensive error management
-   **Notification System**: Rich user feedback for all operations

### Version 1.0.0 - September 15, 2024

-   Initial release with basic tab suspension functionality
-   Context menu integration and settings page
-   Auto-suspension timer and tab group support
-   URL whitelist and memory statistics

**📋 [View Complete Changelog](CHANGELOG.md)** - See detailed version history, technical improvements, and planned features.

## 📝 Changelog Maintenance

This project maintains a comprehensive changelog following industry standards:

-   **[CHANGELOG.md](CHANGELOG.md)**: Complete version history with detailed technical changes
-   **README.md**: Latest version highlights and major feature summaries
-   **Automatic Updates**: Changelog is updated with every release and major improvement
-   **Semantic Versioning**: Follows [semver.org](https://semver.org/) for version numbering
-   **Standard Format**: Based on [Keep a Changelog](https://keepachangelog.com/) best practices

### For Developers: Updating Changelog

```bash
# Interactive mode
node update-changelog.js

# Command line mode
node update-changelog.js "2.1.0" "Added" "New AI-powered suspension feature"
```

### Recent Development Summary

-   **8 unnecessary .md files removed**: Cleaned up development documentation files
-   **Automated changelog system**: Script for maintaining version history
-   **Streamlined documentation**: User-facing README + detailed technical CHANGELOG
-   **Better organization**: Clear separation between user docs and technical changes

## 🤝 Contributing

We welcome contributions! Please feel free to:

-   Report bugs and issues
-   Suggest new features
-   Submit pull requests
-   Improve documentation

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

-   Inspired by The Great Suspender and similar extensions
-   Built with modern Chrome Extension Manifest V3
-   Thanks to the Chrome Extensions community

---

**Save memory. Stay productive. Suspend smartly with Tab Suspend Pro! 💤**
