# Tab Suspend Pro 💤

A powerful Chrome extension that automatically suspends inactive tabs to save up to 80% of memory usage. Keep your browser fast and responsive even with hundreds of open tabs!

## ✨ Features

### 🎯 Smart Tab Management
- **Right-click Context Menu**: Suspend individual tabs or entire tab groups with a simple right-click
- **Automatic Suspension**: Configure tabs to auto-suspend after a specified period of inactivity
- **Intelligent Suggestions**: Get recommendations on which tabs to suspend for maximum memory savings

### ⚙️ Flexible Settings
- **Customizable Timer**: Set suspension time from minutes to hours
- **Enable/Disable Toggle**: Quickly turn the extension on/off
- **Tab Group Control**: Choose which tab groups should never be suspended
- **URL Whitelist**: Exclude specific websites from ever being suspended
- **Advanced Options**: Fine-tune suspension behavior for audio tabs, notifications, and aggressive mode

### 📊 Visual Interface
- **Beautiful Suspended Page**: Suspended tabs show an elegant page with restoration options
- **Memory Statistics**: Track how much memory you're saving
- **Smart Popup**: Quick access to suspend options and suggestions
- **Comprehensive Settings Page**: Full control over all extension features

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
├── manifest.json          # Extension configuration
├── background.js           # Main extension logic
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── options.html           # Settings page
├── options.js             # Settings functionality
├── suspended.html         # Suspended tab page
├── content.js             # Activity tracking
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
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
- Create tab groups in Chrome (right-click tab → "Add to new group")
- In extension settings, choose which groups to exclude from auto-suspension
- Perfect for keeping work projects or important tabs always active

#### URL Whitelist
- Add domains or URL patterns that should never be suspended
- Examples: `localhost:`, `meet.google.com`, `github.com`
- Useful for development servers or important web apps

#### Smart Suggestions
- Click "Find Tabs to Suspend" to get AI-powered recommendations
- See inactive time and estimated memory usage for each tab
- One-click suspension from the suggestions list

## ⚡ Performance Benefits

- **Memory Savings**: Up to 80% reduction in RAM usage per suspended tab
- **Faster Browser**: Reduced memory pressure improves overall performance
- **Battery Life**: Lower CPU usage extends laptop battery life
- **Tab Management**: Handle hundreds of tabs without browser slowdown

## 🛠️ Configuration Options

### General Settings
- **Enable/Disable**: Toggle extension functionality
- **Auto-suspend Timer**: Set inactivity threshold (minutes/hours)

### Tab Groups
- **Exclude Groups**: Prevent specific tab groups from auto-suspension
- **Group Protection**: Keep important workflows always active

### URL Management
- **Whitelist URLs**: Protect specific domains from suspension
- **Pattern Matching**: Use flexible URL patterns

### Advanced Options
- **Audio Tab Handling**: Choose whether to suspend tabs playing audio
- **Notifications**: Enable/disable suspension notifications
- **Aggressive Mode**: More aggressive memory saving (experimental)

## 🔧 Technical Details

### How It Works
1. **Activity Tracking**: Content scripts monitor user interaction with tabs
2. **Smart Detection**: Background service worker tracks tab usage patterns
3. **Memory-Safe Suspension**: Tabs are replaced with lightweight placeholder pages
4. **Instant Restoration**: Clicking suspended tabs immediately restores original content
5. **Context Preservation**: Tab title, favicon, and URL are preserved during suspension

### Permissions Explained
- `tabs`: Monitor and manage browser tabs
- `tabGroups`: Handle tab group operations
- `storage`: Save user preferences and settings
- `contextMenus`: Add right-click menu options
- `scripting`: Track user activity for smart suspension

### Privacy & Security
- **No Data Collection**: Extension works entirely locally
- **No External Servers**: All processing happens in your browser
- **Open Source**: Full code transparency
- **Minimal Permissions**: Only requests necessary browser access

## 🐛 Troubleshooting

### Common Issues

**Extension not working after installation**
- Ensure Developer Mode is enabled
- Try reloading the extension in `chrome://extensions/`
- Check for any error messages in the console

**Tabs not suspending automatically**
- Verify extension is enabled in popup
- Check auto-suspend timer settings
- Ensure tabs aren't in excluded groups or whitelisted URLs

**Suspended tabs not restoring**
- Click anywhere on the suspended page to restore
- Use the "Restore Tab" button on the suspended page
- Check if original URL is still valid

**Context menus not appearing**
- Right-click directly on webpage content
- Ensure extension has proper permissions
- Try refreshing the page

### Advanced Troubleshooting

**Performance Issues**
- Reduce auto-suspend timer for more aggressive suspension
- Enable aggressive mode in advanced settings
- Check Chrome Task Manager for memory usage

**Extension Conflicts**
- Disable other tab management extensions temporarily
- Check for conflicts with ad blockers or privacy extensions

## 🔄 Updates & Changelog

### Version 1.0.0
- Initial release
- Basic tab suspension functionality
- Context menu integration
- Settings page
- Auto-suspension timer
- Tab group support
- URL whitelist
- Memory statistics

## 🤝 Contributing

We welcome contributions! Please feel free to:
- Report bugs and issues
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Inspired by The Great Suspender and similar extensions
- Built with modern Chrome Extension Manifest V3
- Thanks to the Chrome Extensions community

---

**Save memory. Stay productive. Suspend smartly with Tab Suspend Pro! 💤**