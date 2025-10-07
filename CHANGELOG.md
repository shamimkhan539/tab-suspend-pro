# Changelog

All notable changes to Tab Suspend Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [2.0.10] - 2025-10-08

### Maintenance

-   Release focused on maintenance, CSP compliance, and options UI improvements.

### Removed

-   Removed the built-in Google Drive backup option and all associated OAuth flows and UI to reduce complexity and CSP surface area.

### Added

-   Quick "Copy-to-Clipboard" backup action on the Options page for easy export of settings and saved groups.

### Changed

-   Moved inline scripts from `options.html` into `options.js` to comply with Chrome extension CSP (no inline scripts). Implemented vertical tabs driven by `.section-title` elements and wired keyboard navigation and state persistence.
-   Cleaned `modules/cloud-backup.js` to remove Google Drive-specific code paths; Dropbox and OneDrive scaffolding remain for future work.

### Fixed

-   Fixed options page initialization timing and DOM visibility issues so controls and tabs reliably initialize across environments.
-   Resolved several small syntax and event wiring issues introduced during earlier refactors.

## [2.0.1] - 2025-10-08

### Removed

-   Removed built-in Google Drive backup option due to CSP and maintenance concerns. The UI and code paths related to Google Drive backup have been removed to simplify maintenance and reduce OAuth surface area.

### Added

-   Copy-to-Clipboard backup: quick one-click copy of backup JSON to clipboard from the Options page.

### Changed

-   Moved inline scripts from `options.html` into `options.js` to comply with Chrome extension CSP (no inline scripts allowed). This included implementing vertical tabs from `.section-title` and wiring tab behavior in `options.js`.
-   Cleaned `modules/cloud-backup.js` to remove Google Drive-specific code paths; Dropbox and OneDrive scaffolding remain.

### Fixed

-   Fixed several options page initialization timing issues and cleaned up leftover UI/DOM timing bugs so tabs and controls reliably initialize.

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
