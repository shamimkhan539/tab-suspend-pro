# 🏗️ Project Restructuring Plan

## Current Issues

1. ❌ All HTML/JS files mixed in root directory
2. ❌ No clear separation between UI and logic
3. ❌ Documentation mixed with code
4. ❌ No organized asset structure
5. ❌ Hard to scale and maintain
6. ❌ No clear component boundaries

## Proposed Structure

```
tab-suspend-pro/
├── manifest.json                 # Extension manifest (root level)
├── background.js                 # Service worker entry point (root level)
│
├── src/                          # Source code
│   ├── core/                     # Core functionality modules
│   │   ├── tab-manager.js        # Tab suspension logic
│   │   ├── storage-manager.js    # Chrome storage abstraction
│   │   ├── state-manager.js      # Global state management
│   │   └── event-bus.js          # Event communication system
│   │
│   ├── modules/                  # Feature modules
│   │   ├── session-manager/
│   │   │   ├── session-manager.js
│   │   │   ├── session-storage.js
│   │   │   └── session-utils.js
│   │   │
│   │   ├── tracker-blocker/
│   │   │   ├── tracker-blocker.js
│   │   │   ├── filter-lists.js
│   │   │   ├── rule-manager.js
│   │   │   └── stats-tracker.js
│   │   │
│   │   ├── analytics/
│   │   │   ├── performance-analytics.js
│   │   │   ├── activity-analytics.js
│   │   │   └── analytics-utils.js
│   │   │
│   │   ├── privacy/
│   │   │   ├── privacy-manager.js
│   │   │   └── data-cleaner.js
│   │   │
│   │   ├── cloud-sync/
│   │   │   ├── cloud-backup.js
│   │   │   ├── providers/
│   │   │   │   ├── google-drive.js
│   │   │   │   ├── dropbox.js
│   │   │   │   └── onedrive.js
│   │   │   └── sync-engine.js
│   │   │
│   │   └── smart-organizer/
│   │       ├── smart-organizer.js
│   │       ├── grouping-rules.js
│   │       └── profile-manager.js
│   │
│   ├── utils/                    # Utility functions
│   │   ├── url-utils.js          # URL parsing/matching
│   │   ├── time-utils.js         # Time/date formatting
│   │   ├── memory-utils.js       # Memory estimation
│   │   ├── validator.js          # Input validation
│   │   ├── logger.js             # Logging system
│   │   └── constants.js          # App-wide constants
│   │
│   ├── config/                   # Configuration
│   │   ├── default-settings.js   # Default settings
│   │   ├── filter-lists.js       # Tracker blocker filters
│   │   └── permissions.js        # Required permissions
│   │
│   └── content/                  # Content scripts
│       ├── content.js            # Main content script
│       └── injected-scripts/     # Injected scripts
│           └── activity-tracker.js
│
├── ui/                           # User interface
│   ├── popup/                    # Extension popup
│   │   ├── popup.html
│   │   ├── popup.js
│   │   ├── popup.css
│   │   └── components/           # Popup components
│   │       ├── stats-widget.js
│   │       ├── quick-actions.js
│   │       └── tab-selector.js
│   │
│   ├── options/                  # Settings/Options page
│   │   ├── options.html
│   │   ├── options.js
│   │   ├── options.css
│   │   └── sections/
│   │       ├── general-settings.js
│   │       ├── advanced-settings.js
│   │       └── whitelist-manager.js
│   │
│   ├── dashboards/               # Feature dashboards
│   │   ├── main/
│   │   │   ├── dashboard.html
│   │   │   ├── dashboard.js
│   │   │   └── dashboard.css
│   │   │
│   │   ├── analytics/
│   │   │   ├── analytics-dashboard.html
│   │   │   ├── analytics-dashboard.js
│   │   │   └── analytics-dashboard.css
│   │   │
│   │   ├── privacy/
│   │   │   ├── privacy-dashboard.html
│   │   │   ├── privacy-dashboard.js
│   │   │   └── privacy-dashboard.css
│   │   │
│   │   └── tracker-blocker/
│   │       ├── tracker-dashboard.html
│   │       ├── tracker-dashboard.js
│   │       └── tracker-dashboard.css
│   │
│   ├── suspended/                # Suspended page
│   │   ├── suspended.html
│   │   ├── suspended.js
│   │   └── suspended.css
│   │
│   ├── shared/                   # Shared UI components
│   │   ├── components/
│   │   │   ├── modal.js
│   │   │   ├── notification.js
│   │   │   ├── chart.js
│   │   │   ├── data-table.js
│   │   │   └── theme-switcher.js
│   │   │
│   │   └── styles/
│   │       ├── variables.css     # CSS variables
│   │       ├── reset.css         # CSS reset
│   │       ├── common.css        # Common styles
│   │       ├── glassmorphism.css # Glass effect styles
│   │       └── animations.css    # Animations
│   │
│   └── assets/                   # Static assets
│       ├── icons/                # Extension icons
│       │   ├── icon16.png
│       │   ├── icon32.png
│       │   ├── icon48.png
│       │   └── icon128.png
│       │
│       ├── images/               # UI images
│       │   └── placeholder.svg
│       │
│       └── fonts/                # Custom fonts (if any)
│
├── tests/                        # Test files
│   ├── unit/
│   │   ├── core/
│   │   ├── modules/
│   │   └── utils/
│   │
│   ├── integration/
│   │   └── tracker-blocker.test.js
│   │
│   └── e2e/
│       └── suspension-flow.test.js
│
├── docs/                         # Documentation
│   ├── README.md                 # Main readme (symlink to root)
│   ├── CHANGELOG.md              # Changelog (symlink to root)
│   ├── api/
│   │   ├── core-api.md
│   │   └── module-api.md
│   │
│   ├── guides/
│   │   ├── getting-started.md
│   │   ├── tracker-blocker.md
│   │   ├── session-management.md
│   │   └── cloud-sync.md
│   │
│   └── development/
│       ├── architecture.md
│       ├── contributing.md
│       └── module-development.md
│
├── scripts/                      # Build/utility scripts
│   ├── build.js                  # Build script
│   ├── test.js                   # Test runner
│   └── update-changelog.js       # Changelog updater
│
└── dist/                         # Build output (gitignored)
    └── tab-suspend-pro.zip       # Packaged extension
```

## Migration Steps

### Phase 1: Core Restructuring (Week 1)

1. **Create new directory structure**

    ```bash
    mkdir -p src/{core,modules,utils,config,content}
    mkdir -p ui/{popup,options,dashboards,suspended,shared,assets}
    mkdir -p tests/{unit,integration,e2e}
    mkdir -p docs/{api,guides,development}
    mkdir -p scripts
    ```

2. **Move core files**

    - Move `background.js` logic to `src/core/`
    - Keep entry point in root
    - Move `content.js` to `src/content/`

3. **Reorganize modules**

    - Create subfolders for each module
    - Split large modules into smaller files
    - Extract filter lists to `src/config/`

4. **Move UI files**
    - Organize HTML/JS/CSS by feature
    - Create component structure
    - Extract shared styles

### Phase 2: Modularization (Week 2)

1. **Extract utilities**

    - Create utility modules
    - Remove code duplication
    - Add proper exports

2. **Create shared components**

    - Modal component
    - Notification system
    - Chart components
    - Theme switcher

3. **Implement event bus**
    - Module communication
    - State management
    - Event handling

### Phase 3: Configuration & Build (Week 3)

1. **Setup build system**

    - Bundle modules
    - Minify code
    - Generate manifest dynamically

2. **Add testing infrastructure**

    - Unit tests
    - Integration tests
    - E2E tests

3. **Documentation**
    - API documentation
    - User guides
    - Developer docs

## Module Structure Template

Each module should follow this pattern:

```javascript
// src/modules/[module-name]/[module-name].js

class ModuleName {
    constructor(dependencies) {
        this.deps = dependencies;
        this.state = {};
        this.config = {};
    }

    async init() {
        await this.loadConfig();
        await this.loadState();
        this.setupListeners();
    }

    async loadConfig() {
        // Load module configuration
    }

    async loadState() {
        // Load persistent state
    }

    setupListeners() {
        // Setup event listeners
    }

    // Public API methods
    async doSomething() {
        // Implementation
    }

    // Private methods
    _privateMethod() {
        // Implementation
    }

    // Cleanup
    async destroy() {
        // Cleanup resources
    }
}

export default ModuleName;
```

## Benefits

### 1. **Scalability**

-   Easy to add new features
-   Clear module boundaries
-   Minimal coupling

### 2. **Maintainability**

-   Easy to find files
-   Clear responsibility
-   Testable code

### 3. **Performance**

-   Code splitting
-   Lazy loading
-   Optimized bundles

### 4. **Developer Experience**

-   Clear structure
-   Easy onboarding
-   Better IDE support

### 5. **Testing**

-   Unit testable
-   Integration testable
-   E2E testable

## Backward Compatibility

During migration:

1. Keep old structure working
2. Gradual migration
3. No breaking changes
4. Update manifest paths incrementally

## Build System

Use a simple build system:

```javascript
// scripts/build.js
const fs = require("fs");
const path = require("path");

// Bundle modules
// Copy assets
// Update manifest
// Create zip
```

## Configuration Management

```javascript
// src/config/default-settings.js
export const DEFAULT_SETTINGS = {
    suspension: {
        enabled: true,
        autoSuspendTime: 30,
        whitelistedUrls: [],
    },
    trackerBlocker: {
        enabled: true,
        blockAds: true,
        blockTrackers: true,
    },
    // ... more settings
};
```

## Event Bus Pattern

```javascript
// src/core/event-bus.js
class EventBus {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach((callback) => callback(data));
        }
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(
                (cb) => cb !== callback
            );
        }
    }
}

export default new EventBus();
```

## Next Steps

1. **Review this plan** - Make sure it fits your needs
2. **Create migration script** - Automate file moving
3. **Update manifest.json** - Point to new paths
4. **Test thoroughly** - Ensure nothing breaks
5. **Update documentation** - Reflect new structure

## Timeline

-   **Week 1**: Directory structure + file moving
-   **Week 2**: Modularization + shared components
-   **Week 3**: Build system + testing + docs
-   **Week 4**: Polish + optimization + final testing

## Questions to Consider

1. Do you want to use a bundler (Webpack, Rollup, Vite)?
2. Do you want TypeScript support?
3. Do you need a CSS preprocessor (SASS, LESS)?
4. What testing framework (Jest, Mocha, Vitest)?
5. Do you want CI/CD setup?

Let me know if you want me to start implementing this structure!
