// Background service worker for Tab Suspend Pro
class TabSuspendManager {
  constructor() {
    this.tabActivity = new Map();
    this.suspendedTabs = new Set();
    this.settings = {
      enabled: true,
      autoSuspendTime: 30,
      excludedGroups: [],
      whitelistedUrls: ['chrome://', 'chrome-extension://', 'edge://', 'about:']
    };
    this.init();
  }

  async init() {
    try {
      await this.loadSettings();
      this.setupContextMenus();
      this.setupEventListeners();
      this.setupMessageHandlers();
      this.startMonitoring();
      console.log('Tab Suspend Pro initialized');
    } catch (error) {
      console.error('Error initializing extension:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.sync.get(['tabSuspendSettings']);
      if (stored.tabSuspendSettings) {
        this.settings = Object.assign(this.settings, stored.tabSuspendSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  setupContextMenus() {
    try {
      chrome.contextMenus.removeAll(() => {
        // Context menu for extension icon (action context)
        chrome.contextMenus.create({
          id: 'suspend-current-tab',
          title: 'Suspend This Tab',
          contexts: ['action']
        });

        chrome.contextMenus.create({
          id: 'restore-current-tab',
          title: 'Restore This Tab',
          contexts: ['action']
        });

        chrome.contextMenus.create({
          id: 'separator1',
          type: 'separator',
          contexts: ['action']
        });

        chrome.contextMenus.create({
          id: 'suspend-tab-group',
          title: 'Suspend Tab Group',
          contexts: ['action']
        });

        chrome.contextMenus.create({
          id: 'restore-tab-group',
          title: 'Restore Tab Group',
          contexts: ['action']
        });

        chrome.contextMenus.create({
          id: 'separator2',
          type: 'separator',
          contexts: ['action']
        });

        chrome.contextMenus.create({
          id: 'suggest-tabs',
          title: 'Suggest Tabs to Suspend',
          contexts: ['action']
        });

        // Context menus for webpage content (page context)
        chrome.contextMenus.create({
          id: 'page-suspend-tab',
          title: '💤 Suspend This Tab',
          contexts: ['page'],
          documentUrlPatterns: ['http://*/*', 'https://*/*']
        });

        chrome.contextMenus.create({
          id: 'page-suspend-group',
          title: '💤 Suspend Tab Group',
          contexts: ['page'],
          documentUrlPatterns: ['http://*/*', 'https://*/*']
        });

        chrome.contextMenus.create({
          id: 'page-restore-tab',
          title: '🔄 Restore This Tab',
          contexts: ['page'],
          documentUrlPatterns: ['http://*/*', 'https://*/*']
        });

        // Also add context menus for all pages
        chrome.contextMenus.create({
          id: 'all-suspend-tab',
          title: '💤 Tab Suspend Pro - Suspend Tab',
          contexts: ['all']
        });

        chrome.contextMenus.create({
          id: 'all-suspend-group',
          title: '💤 Tab Suspend Pro - Suspend Group',
          contexts: ['all']
        });
      });

      console.log('Context menus setup complete');
    } catch (error) {
      console.error('Error setting up context menus:', error);
    }
  }

  setupEventListeners() {
    try {
      // Don't track activity on tab activation to prevent auto-restoration
      chrome.tabs.onActivated.addListener((activeInfo) => {
        // Only update activity if tab is not suspended
        chrome.tabs.get(activeInfo.tabId).then(tab => {
          if (!tab.url.includes('suspended.html')) {
            this.updateTabActivity(activeInfo.tabId);
          }
        }).catch(() => {
          // Ignore errors
        });
      });

      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        // Only track activity if tab is not suspended and loading is complete
        if (changeInfo.status === 'complete' && !tab.url.includes('suspended.html')) {
          this.updateTabActivity(tabId);
        }
        
        // If a suspended tab is being reloaded/navigated away from suspended page
        if (this.suspendedTabs.has(tabId) && 
            changeInfo.url && 
            !changeInfo.url.includes('suspended.html')) {
          console.log('Suspended tab was restored externally:', tabId);
          this.suspendedTabs.delete(tabId);
        }
      });

      chrome.tabs.onRemoved.addListener((tabId) => {
        this.tabActivity.delete(tabId);
        this.suspendedTabs.delete(tabId);
      });

      chrome.storage.onChanged.addListener((changes) => {
        if (changes.tabSuspendSettings) {
          this.settings = Object.assign(this.settings, changes.tabSuspendSettings.newValue);
        }
      });

      // Set up context menu click handler
      chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        await this.handleContextMenuClick(info, tab);
      });

      // Set up keyboard shortcut handlers
      chrome.commands.onCommand.addListener(async (command) => {
        await this.handleKeyboardShortcut(command);
      });
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'suspendTab':
          await this.suspendTab(message.tabId);
          sendResponse({ success: true });
          break;
        case 'restoreTab':
          await this.restoreTab(message.tabId);
          sendResponse({ success: true });
          break;
        case 'suspendTabGroup':
          await this.suspendTabGroup(message.groupId);
          sendResponse({ success: true });
          break;
        case 'suggestTabs':
          await this.suggestTabsToSuspend();
          sendResponse({ success: true });
          break;
        case 'restoreAllTabs':
          await this.restoreAllTabs();
          sendResponse({ success: true });
          break;
        case 'updateActivity':
          if (sender.tab && !sender.tab.url.includes('suspended.html')) {
            this.updateTabActivity(sender.tab.id);
          }
          sendResponse({ success: true });
          break;
        case 'manualRestore':
          // This is called from the suspended page when user clicks to restore
          if (sender.tab) {
            await this.restoreTab(sender.tab.id);
          }
          sendResponse({ success: true });
          break;
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  updateTabActivity(tabId) {
    this.tabActivity.set(tabId, Date.now());
    
    if (this.suspendedTabs.has(tabId)) {
      this.restoreTab(tabId);
    }
  }

  async handleContextMenuClick(info, tab) {
    try {
      console.log('Context menu clicked:', info.menuItemId);
      
      // Get the active tab if needed
      if (!tab) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tab = activeTab;
      }

      switch (info.menuItemId) {
        case 'suspend-current-tab':
        case 'page-suspend-tab':
        case 'all-suspend-tab':
          await this.suspendTab(tab.id);
          break;
        case 'restore-current-tab':
        case 'page-restore-tab':
          await this.restoreTab(tab.id);
          break;
        case 'suspend-tab-group':
        case 'page-suspend-group':
        case 'all-suspend-group':
          if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
            await this.suspendTabGroup(tab.groupId);
          } else {
            // Show notification that tab is not in a group
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon48.png',
              title: 'Tab Suspend Pro',
              message: 'This tab is not in a group. Create a tab group first!'
            });
          }
          break;
        case 'restore-tab-group':
          if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
            await this.restoreTabGroup(tab.groupId);
          }
          break;
        case 'suggest-tabs':
          await this.suggestTabsToSuspend();
          break;
      }
    } catch (error) {
      console.error('Error handling context menu click:', error);
    }
  }

  async handleKeyboardShortcut(command) {
    try {
      console.log('Keyboard shortcut triggered:', command);
      
      // Get the active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      switch (command) {
        case 'suspend-current-tab':
          await this.suspendTab(activeTab.id);
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Tab Suspend Pro',
            message: 'Tab suspended: ' + activeTab.title
          });
          break;
        case 'suspend-tab-group':
          if (activeTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
            await this.suspendTabGroup(activeTab.groupId);
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon48.png',
              title: 'Tab Suspend Pro',
              message: 'Tab group suspended!'
            });
          } else {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon48.png',
              title: 'Tab Suspend Pro',
              message: 'This tab is not in a group. Create a tab group first!'
            });
          }
          break;
        case 'restore-all-tabs':
          await this.restoreAllTabs();
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Tab Suspend Pro',
            message: 'All suspended tabs restored!'
          });
          break;
      }
    } catch (error) {
      console.error('Error handling keyboard shortcut:', error);
    }
  }

  async suspendTab(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      
      if (this.isWhitelisted(tab.url)) {
        console.log('Tab is whitelisted, skipping suspension:', tab.url);
        return;
      }

      if (tab.audible) {
        console.log('Tab is playing audio, skipping suspension');
        return;
      }

      // Don't suspend if already suspended
      if (tab.url.includes('suspended.html')) {
        console.log('Tab is already suspended');
        return;
      }

      const suspendedUrl = chrome.runtime.getURL('suspended.html') + 
        '?url=' + encodeURIComponent(tab.url) + 
        '&title=' + encodeURIComponent(tab.title) + 
        '&favicon=' + encodeURIComponent(tab.favIconUrl || '');

      // Store the tab in suspended state before navigating
      this.suspendedTabs.add(tabId);

      await chrome.tabs.update(tabId, { url: suspendedUrl });

      console.log('Tab suspended successfully:', tab.title);
      
      // Remove from activity tracking to prevent interference
      this.tabActivity.delete(tabId);
      
    } catch (error) {
      console.error('Error suspending tab:', error);
      // Remove from suspended set if suspension failed
      this.suspendedTabs.delete(tabId);
    }
  }

  async restoreTab(tabId) {
    try {
      if (!this.suspendedTabs.has(tabId)) {
        return;
      }

      const tab = await chrome.tabs.get(tabId);
      const url = new URL(tab.url);
      const originalUrl = url.searchParams.get('url');

      if (originalUrl) {
        await chrome.tabs.update(tabId, { url: originalUrl });
        this.suspendedTabs.delete(tabId);
        this.updateTabActivity(tabId);
        console.log('Tab restored');
      }
    } catch (error) {
      console.error('Error restoring tab:', error);
    }
  }

  async suspendTabGroup(groupId) {
    try {
      const tabs = await chrome.tabs.query({ groupId });
      console.log('Suspending tab group with', tabs.length, 'tabs');
      
      // Get the currently active tab to switch to after suspension
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let switchToTabId = null;
      
      // Find a non-group tab to switch to, or create a new tab
      const nonGroupTabs = await chrome.tabs.query({ 
        currentWindow: true, 
        groupId: chrome.tabGroups.TAB_GROUP_ID_NONE 
      });
      
      if (nonGroupTabs.length > 0) {
        switchToTabId = nonGroupTabs[0].id;
      } else {
        // Create a new tab to switch to
        const newTab = await chrome.tabs.create({ url: 'chrome://newtab/', active: false });
        switchToTabId = newTab.id;
      }
      
      // Suspend all tabs in the group
      for (const tab of tabs) {
        await this.suspendTab(tab.id);
      }
      
      // If the active tab was in this group, switch to another tab
      if (activeTab && activeTab.groupId === groupId && switchToTabId) {
        await chrome.tabs.update(switchToTabId, { active: true });
      }
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Tab Suspend Pro',
        message: `Suspended ${tabs.length} tabs from the group!`
      });
      
    } catch (error) {
      console.error('Error suspending tab group:', error);
    }
  }

  async restoreTabGroup(groupId) {
    try {
      const tabs = await chrome.tabs.query({ groupId });
      const restorePromises = tabs
        .filter(tab => this.suspendedTabs.has(tab.id))
        .map(tab => this.restoreTab(tab.id));
      
      await Promise.all(restorePromises);
    } catch (error) {
      console.error('Error restoring tab group:', error);
    }
  }

  async suggestTabsToSuspend() {
    try {
      const tabs = await chrome.tabs.query({});
      const now = Date.now();
      const suggestions = [];

      for (const tab of tabs) {
        if (tab.active || this.suspendedTabs.has(tab.id) || this.isWhitelisted(tab.url)) {
          continue;
        }

        const lastActivity = this.tabActivity.get(tab.id) || 0;
        const inactiveTime = (now - lastActivity) / (1000 * 60);

        if (inactiveTime > 15) {
          suggestions.push({
            id: tab.id,
            title: tab.title,
            url: tab.url,
            inactiveTime: Math.round(inactiveTime),
            memoryEstimate: this.estimateTabMemory(tab)
          });
        }
      }

      suggestions.sort((a, b) => b.inactiveTime - a.inactiveTime);
      this.showSuggestions(suggestions);
    } catch (error) {
      console.error('Error getting suggestions:', error);
    }
  }

  showSuggestions(suggestions) {
    try {
      chrome.storage.local.set({ 
        suggestions: suggestions,
        suggestionTimestamp: Date.now()
      });

      if (suggestions.length > 0) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Tab Suspend Pro',
          message: 'Found ' + suggestions.length + ' tabs that can be suspended!'
        });
      } else {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Tab Suspend Pro',
          message: 'No tabs found that need suspending!'
        });
      }
    } catch (error) {
      console.error('Error showing suggestions:', error);
    }
  }

  startMonitoring() {
    if (!this.settings.enabled) {
      return;
    }

    setInterval(async () => {
      await this.autoSuspendTabs();
    }, 60000);
  }

  async autoSuspendTabs() {
    if (!this.settings.enabled) {
      return;
    }

    try {
      const tabs = await chrome.tabs.query({});
      const now = Date.now();
      const suspendThreshold = this.settings.autoSuspendTime * 60 * 1000;

      for (const tab of tabs) {
        if (tab.active || this.suspendedTabs.has(tab.id) || this.isWhitelisted(tab.url)) {
          continue;
        }

        if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && 
            this.settings.excludedGroups.includes(tab.groupId)) {
          continue;
        }

        const lastActivity = this.tabActivity.get(tab.id) || now;
        const inactiveTime = now - lastActivity;

        if (inactiveTime > suspendThreshold) {
          await this.suspendTab(tab.id);
        }
      }
    } catch (error) {
      console.error('Error in auto-suspend:', error);
    }
  }

  async restoreAllTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const restorePromises = tabs
        .filter(tab => this.suspendedTabs.has(tab.id))
        .map(tab => this.restoreTab(tab.id));
      
      await Promise.all(restorePromises);
      console.log('All suspended tabs restored');
    } catch (error) {
      console.error('Error restoring all tabs:', error);
    }
  }

  isWhitelisted(url) {
    return this.settings.whitelistedUrls.some(pattern => url.startsWith(pattern));
  }

  async addToWhitelist(url, type) {
    try {
      let urlToAdd = '';
      
      if (type === 'url') {
        // Add exact URL
        urlToAdd = url;
      } else if (type === 'domain') {
        // Extract domain from URL
        try {
          const urlObj = new URL(url);
          urlToAdd = urlObj.hostname;
        } catch (error) {
          // If URL parsing fails, try to extract domain manually
          const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
          urlToAdd = match ? match[1] : url;
        }
      }
      
      if (urlToAdd && !this.settings.whitelistedUrls.includes(urlToAdd)) {
        this.settings.whitelistedUrls.push(urlToAdd);
        await this.saveSettings();
        
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Tab Suspend Pro',
          message: `Added to whitelist: ${urlToAdd}`
        });
        
        console.log('Added to whitelist:', urlToAdd);
      }
    } catch (error) {
      console.error('Error adding to whitelist:', error);
    }
  }
    let estimate = 30; // Base memory in MB

    // URL-based estimates
    if (tab.url.includes('youtube.com') || tab.url.includes('video')) {
      estimate += 150; // Video streaming uses lots of memory
    } else if (tab.url.includes('docs.google.com') || tab.url.includes('office.com')) {
      estimate += 100; // Office applications are memory-heavy
    } else if (tab.url.includes('github.com')) {
      estimate += 40; // Code repositories with syntax highlighting
    } else if (tab.url.includes('stackoverflow.com') || tab.url.includes('reddit.com')) {
      estimate += 35; // Content-heavy sites
    } else if (tab.url.includes('facebook.com') || tab.url.includes('twitter.com') || tab.url.includes('linkedin.com')) {
      estimate += 80; // Social media with dynamic content
    } else if (tab.url.includes('gmail.com') || tab.url.includes('outlook.com')) {
      estimate += 70; // Email clients with lots of JS
    } else if (tab.url.includes('atlassian.net') || tab.url.includes('jira') || tab.url.includes('confluence')) {
      estimate += 90; // Enterprise tools are memory-intensive
    } else if (tab.url.includes('figma.com') || tab.url.includes('canva.com')) {
      estimate += 120; // Design tools
    } else if (tab.url.includes('netflix.com') || tab.url.includes('hulu.com') || tab.url.includes('primevideo.com')) {
      estimate += 180; // Video streaming services
    } else if (tab.url.includes('spotify.com') || tab.url.includes('music')) {
      estimate += 60; // Music streaming
    } else if (tab.url.includes('discord.com') || tab.url.includes('slack.com')) {
      estimate += 85; // Chat applications
    } else if (tab.url.includes('maps.google.com') || tab.url.includes('maps')) {
      estimate += 110; // Maps applications
    }

    // Title-based adjustments
    if (tab.title) {
      const title = tab.title.toLowerCase();
      if (title.includes('dashboard') || title.includes('admin')) {
        estimate += 25; // Admin interfaces tend to be heavy
      }
      if (title.includes('editor') || title.includes('ide')) {
        estimate += 30; // Code editors
      }
      if (title.includes('meeting') || title.includes('zoom') || title.includes('teams')) {
        estimate += 100; // Video conferencing
      }
    }

    // Audible tabs use more memory
    if (tab.audible) {
      estimate += 50;
    }

    // Pinned tabs might be more important but also potentially heavier
    if (tab.pinned) {
      estimate += 20;
    }

    return Math.min(estimate, 300); // Cap at 300MB for reasonable estimates
  }
}

const tabSuspendManager = new TabSuspendManager();