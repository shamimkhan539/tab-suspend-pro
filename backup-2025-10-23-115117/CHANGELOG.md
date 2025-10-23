# Changelog

All notable changes to Tab Suspend Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2024-10-23

### 🛡️ Major Features Added

-   **Tracker Blocker Module**: Comprehensive ad and tracker blocking similar to uBlock Origin
    -   Block ads from major ad networks (Google, DoubleClick, Amazon, Taboola, etc.)
    -   Block analytics and tracking scripts (Google Analytics, Facebook Pixel, Mixpanel, etc.)
    -   Block social media widgets and embeds (Facebook, Twitter, LinkedIn, etc.)
    -   Block cryptocurrency mining scripts (CoinHive, CryptoLoot, etc.)
    -   Block known malware domains
-   **Tracker Blocker Dashboard**: Full-featured dashboard for managing blocking rules
    -   Real-time statistics (total blocked, session blocked, active rules)
    -   Blocked requests breakdown by type (ads, trackers, social, crypto, malware)
    -   Top blocked domains visualization
    -   Filter category toggles (enable/disable each category independently)
-   **Custom Filter Support**: Add your own URL patterns to block
-   **Whitelist Management**: Exclude trusted domains from all blocking rules
-   **Import/Export Functionality**: Share filter configurations and whitelist across devices

### 🔧 Technical Improvements

-   **Manifest V3 Compliance**: Uses `declarativeNetRequest` API for efficient blocking
-   **Performance Optimized**: Native Chrome API for minimal CPU/memory overhead
-   **Privacy-Focused**: All processing happens locally, no external servers
-   **Context Menu Integration**: Quick access to tracker blocker from right-click menu
-   **Popup Integration**: One-click access to tracker dashboard from extension popup

### 📊 New Permissions Added

-   `declarativeNetRequest`: Create and manage blocking rules
-   `declarativeNetRequestFeedback`: Track blocked requests for statistics
-   `webNavigation`: Monitor page navigation for session management
-   `webRequest`: Additional request monitoring capabilities
-   `<all_urls>`: Apply blocking rules to all websites

### 📝 Documentation

-   Added comprehensive **TRACKER_BLOCKER_README.md** with:
    -   Feature overview and usage instructions
    -   Filter list documentation
    -   Import/export guide
    -   Troubleshooting section
    -   Comparison with uBlock Origin
-   Updated main README.md with tracker blocker feature highlights

## [2.0.0] - 2024-10-04

### 🚀 Major Features Added

-   **Extension Toggle Functionality**: Complete enable/disable functionality in popup with visual feedback
-   **Backup & Sync System**: Export/import settings, auto-backup configuration, Chrome sync integration
-   **Advanced Analytics Dashboard**: Comprehensive memory usage tracking, performance insights, and suspension statistics
-   **Smart Session Management**: Enhanced session snapshots with scheduler and templates
-   **Privacy Dashboard**: Data usage tracking and privacy controls

### 🛠️ Critical Fixes

-   **Duplicate Tab Restoration**: Fixed major issue where browser session restore created duplicate tabs
-   **Button Overlap**: Resolved UI overlap between settings and theme toggle buttons
-   **Group Preservation**: Tab groups now properly maintained after browser restart
-   **Session Restore Detection**: Intelligent detection of Chrome session restoration to prevent conflicts

### 🎨 UI/UX Improvements

-   **Glassmorphism Design**: Beautiful glass effect throughout popup and options pages
-   **Enhanced Backgrounds**: Rich gradient backgrounds with layered visual effects
-   **Responsive Layout**: Improved responsive design for all screen sizes
-   **Theme Support**: Enhanced light/dark mode with proper contrast ratios
-   **Smooth Animations**: Added hover effects and smooth transitions

### ⚡ Performance Enhancements

-   **Badge Counter**: Real-time display of suspended tabs count in extension badge
-   **Smart Timing**: Delayed initialization to avoid Chrome session restore conflicts
-   **Better Error Handling**: Graceful fallbacks and comprehensive error management
-   **Notification System**: Rich user feedback for all operations

### 🔧 Technical Improvements

-   **Enhanced Metadata Storage**: Improved tab information persistence with group data
-   **Smart Duplicate Detection**: Algorithm to detect and cleanup duplicate tabs (>30% threshold)
-   **Group Information Tracking**: Store and restore tab group ID, title, and color
-   **Context-Aware Operations**: Different behaviors based on browser state and user activity

### 📊 New Analytics Features

-   **Memory Dashboard**: Detailed charts showing memory usage over time
-   **Usage Heatmap**: Visual calendar of daily tab usage patterns
-   **Performance Insights**: CPU usage and network activity tracking per tab
-   **Browser Health Score**: Overall performance rating system (0-100)

## [1.0.0] - 2024-09-15

### Added

-   Initial release of Tab Suspend Pro
-   Basic tab suspension functionality
-   Right-click context menu integration
-   Settings page with customizable options
-   Auto-suspension timer configuration
-   Tab group support and management
-   URL whitelist for protected sites
-   Memory usage statistics
-   Beautiful suspended page with one-click restoration
-   Chrome Extension Manifest V3 compliance

### Features

-   **Smart Tab Suspension**: Automatic suspension based on inactivity
-   **Context Menu Integration**: Right-click options for tabs and groups
-   **Advanced Settings**: Customizable timers, group exclusions, URL patterns
-   **Session Management**: Basic session saving and restoration
-   **Memory Optimization**: Up to 80% memory reduction per suspended tab
-   **Privacy-First**: No data collection, works entirely locally

---

## Planned Features (Roadmap)

### 🔮 Coming Soon

-   **Google Drive Integration**: Cloud backup and sync across devices
-   **AI-Powered Suspension**: Machine learning recommendations
-   **Cross-Device Sync**: Sync sessions between different browsers/devices
-   **Smart Preloading**: Predict and preload likely-to-visit tabs
-   **Automatic Cleanup**: Remove duplicate tabs and abandoned carts

### 🚀 Future Enhancements

-   **Team Workspaces**: Shared tab configurations for teams
-   **Advanced Automation**: Context-aware rules based on time/activity
-   **Integration APIs**: Connect with productivity tools and services
-   **Mobile Companion**: Mobile app for session management
-   **Enterprise Features**: Admin controls and usage analytics

---

## How to Read This Changelog

-   **Added** for new features
-   **Changed** for changes in existing functionality
-   **Deprecated** for soon-to-be removed features
-   **Removed** for now removed features
-   **Fixed** for any bug fixes
-   **Security** for vulnerability fixes

Each version follows semantic versioning (MAJOR.MINOR.PATCH):

-   **MAJOR**: Incompatible API changes
-   **MINOR**: Backwards-compatible functionality additions
-   **PATCH**: Backwards-compatible bug fixes
