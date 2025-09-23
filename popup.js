// Popup script for Tab Suspend Pro
class PopupManager {
  constructor() {
    this.settings = {};
    this.stats = { suspended: 0, memorySaved: 0 };
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.updateStats();
    await this.loadTabGroups();
    this.setupEventListeners();
    this.updateUI();
    await this.checkForSuggestions();
  }

  async loadSettings() {
    const result = await chrome.storage.sync.get(['tabSuspendSettings']);
    this.settings = result.tabSuspendSettings || { enabled: true };
  }

  async loadTabGroups() {
    try {
      const groups = await chrome.tabGroups.query({});
      this.tabGroups = groups;
      this.populateGroupDropdown(groups);
      await this.populateRestoreGroupDropdown();
    } catch (error) {
      console.error('Error loading tab groups:', error);
    }
  }

  populateGroupDropdown(groups) {
    const dropdown = document.getElementById('group-dropdown');
    dropdown.innerHTML = '';
    
    if (groups.length === 0) {
      dropdown.innerHTML = '<option value="">No tab groups found</option>';
      return;
    }
    
    dropdown.innerHTML = '<option value="">Select a tab group...</option>';
    
    groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.title || `Unnamed Group (${group.id})`;
      option.style.color = group.color || '#495057';
      dropdown.appendChild(option);
    });
  }

  async populateRestoreGroupDropdown() {
    try {
      const tabs = await chrome.tabs.query({});
      const suspendedGroupIds = new Set();
      
      // Find all group IDs that have suspended tabs
      tabs.forEach(tab => {
        if (tab.url && tab.url.includes('suspended.html') && 
            tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          suspendedGroupIds.add(tab.groupId);
        }
      });

      const dropdown = document.getElementById('restore-group-dropdown');
      dropdown.innerHTML = '';
      
      if (suspendedGroupIds.size === 0) {
        dropdown.innerHTML = '<option value="">No suspended groups found</option>';
        return;
      }
      
      dropdown.innerHTML = '<option value="">Select a group to restore...</option>';
      
      // Get group details for suspended groups
      for (const groupId of suspendedGroupIds) {
        try {
          const group = await chrome.tabGroups.get(groupId);
          const groupTabs = tabs.filter(tab => tab.groupId === groupId);
          const suspendedCount = groupTabs.filter(tab => tab.url.includes('suspended.html')).length;
          
          const option = document.createElement('option');
          option.value = groupId;
          option.textContent = `${group.title || 'Unnamed Group'} (${suspendedCount} suspended)`;
          option.style.color = group.color || '#495057';
          dropdown.appendChild(option);
        } catch (error) {
          // Group might have been deleted, skip it
          continue;
        }
      }
    } catch (error) {
      console.error('Error loading suspended groups:', error);
    }
  }

  async updateStats() {
    try {
      const tabs = await chrome.tabs.query({});
      let suspendedCount = 0;
      let memorySaved = 0;

      for (const tab of tabs) {
        // Check if tab URL contains the suspended page
        if (tab.url && tab.url.includes('suspended.html')) {
          suspendedCount++;
          memorySaved += this.estimateTabMemory(tab);
        }
      }

      this.stats = { suspended: suspendedCount, memorySaved };
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  setupEventListeners() {
    // Toggle extension
    document.getElementById('toggle').addEventListener('click', async () => {
      this.settings.enabled = !this.settings.enabled;
      await chrome.storage.sync.set({ tabSuspendSettings: this.settings });
      this.updateUI();
    });

    // Suspend current tab
    document.getElementById('suspend-current').addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await this.sendMessageToBackground('suspendTab', { tabId: tab.id });
      setTimeout(() => this.updateStats(), 500);
    });

    // Suggest tabs
    document.getElementById('suggest-tabs').addEventListener('click', async () => {
      await this.sendMessageToBackground('suggestTabs');
      setTimeout(() => this.checkForSuggestions(), 500);
    });

    // Restore all tabs
    document.getElementById('restore-all').addEventListener('click', async () => {
      await this.sendMessageToBackground('restoreAllTabs');
      setTimeout(() => this.updateStats(), 500);
    });

    // Open settings
    document.getElementById('open-settings').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Toggle group selector
    document.getElementById('toggle-group-selector').addEventListener('click', () => {
      const groupSelector = document.getElementById('group-selector');
      const restoreSelector = document.getElementById('restore-group-selector');
      const isVisible = groupSelector.style.display !== 'none';
      
      groupSelector.style.display = isVisible ? 'none' : 'block';
      restoreSelector.style.display = 'none'; // Hide restore selector
      
      if (!isVisible) {
        this.loadTabGroups();
      }
    });

    // Toggle restore group selector
    document.getElementById('toggle-restore-group-selector').addEventListener('click', () => {
      const groupSelector = document.getElementById('group-selector');
      const restoreSelector = document.getElementById('restore-group-selector');
      const isVisible = restoreSelector.style.display !== 'none';
      
      restoreSelector.style.display = isVisible ? 'none' : 'block';
      groupSelector.style.display = 'none'; // Hide suspend selector
      
      if (!isVisible) {
        this.populateRestoreGroupDropdown();
      }
    });

    // Suspend selected group
    document.getElementById('suspend-selected-group').addEventListener('click', async () => {
      const dropdown = document.getElementById('group-dropdown');
      const selectedGroupId = dropdown.value;
      
      if (!selectedGroupId) {
        alert('Please select a tab group first');
        return;
      }
      
      await this.sendMessageToBackground('suspendTabGroup', { groupId: parseInt(selectedGroupId) });
      setTimeout(() => this.updateStats(), 500);
      
      document.getElementById('group-selector').style.display = 'none';
    });

    // Restore selected group
    document.getElementById('restore-selected-group').addEventListener('click', async () => {
      const dropdown = document.getElementById('restore-group-dropdown');
      const selectedGroupId = dropdown.value;
      
      if (!selectedGroupId) {
        alert('Please select a group to restore first');
        return;
      }
      
      await this.sendMessageToBackground('restoreTabGroup', { groupId: parseInt(selectedGroupId) });
      setTimeout(() => {
        this.updateStats();
        this.populateRestoreGroupDropdown(); // Refresh the restore dropdown
      }, 500);
      
      document.getElementById('restore-group-selector').style.display = 'none';
    });
  }

  updateUI() {
    const toggle = document.getElementById('toggle');
    const statusText = document.getElementById('status-text');
    
    if (this.settings.enabled) {
      toggle.classList.add('active');
      statusText.textContent = 'Extension Enabled';
    } else {
      toggle.classList.remove('active');
      statusText.textContent = 'Extension Disabled';
    }

    document.getElementById('suspended-count').textContent = this.stats.suspended;
    document.getElementById('memory-saved').textContent = `${this.stats.memorySaved}MB`;
  }

  async checkForSuggestions() {
    try {
      const result = await chrome.storage.local.get(['suggestions', 'suggestionTimestamp']);
      const suggestions = result.suggestions || [];
      const timestamp = result.suggestionTimestamp || 0;
      
      // Only show suggestions if they're recent (within 5 minutes)
      if (suggestions.length > 0 && Date.now() - timestamp < 5 * 60 * 1000) {
        this.displaySuggestions(suggestions.slice(0, 5)); // Show max 5 suggestions
      }
    } catch (error) {
      console.error('Error checking suggestions:', error);
    }
  }

  displaySuggestions(suggestions) {
    const suggestionsDiv = document.getElementById('suggestions');
    const suggestionList = document.getElementById('suggestion-list');
    
    if (suggestions.length === 0) {
      suggestionsDiv.style.display = 'none';
      return;
    }

    suggestionList.innerHTML = '';
    
    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      
      item.innerHTML = `
        <img class="suggestion-favicon" src="${suggestion.favicon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMkw4Ljc3IDYuMTdMMTMgN0w4Ljc3IDEwLjgzTDggMTRMNy4yMyAxMC44M0wzIDdMNy4yMyA2LjE3TDggMloiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4='}" alt="">
        <div class="suggestion-info">
          <div class="suggestion-title">${suggestion.title}</div>
          <div class="suggestion-meta">${suggestion.inactiveTime}min inactive • ~${suggestion.memoryEstimate}MB</div>
        </div>
        <div class="suggestion-actions">
          <button class="btn btn-primary btn-small" onclick="suspendSuggestedTab(${suggestion.id})">Suspend</button>
        </div>
      `;
      
      suggestionList.appendChild(item);
    });
    
    suggestionsDiv.style.display = 'block';
  }

  async sendMessageToBackground(action, data = {}) {
    try {
      await chrome.runtime.sendMessage({ action, ...data });
    } catch (error) {
      console.error('Error sending message to background:', error);
    }
  }

  estimateTabMemory(tab) {
    let estimate = 30; // Base memory in MB

    // URL-based estimates
    if (tab.url.includes('youtube.com') || tab.url.includes('video')) {
      estimate += 150;
    } else if (tab.url.includes('docs.google.com') || tab.url.includes('office.com')) {
      estimate += 100;
    } else if (tab.url.includes('github.com')) {
      estimate += 40;
    } else if (tab.url.includes('stackoverflow.com') || tab.url.includes('reddit.com')) {
      estimate += 35;
    } else if (tab.url.includes('facebook.com') || tab.url.includes('twitter.com') || tab.url.includes('linkedin.com')) {
      estimate += 80;
    } else if (tab.url.includes('gmail.com') || tab.url.includes('outlook.com')) {
      estimate += 70;
    } else if (tab.url.includes('atlassian.net') || tab.url.includes('jira') || tab.url.includes('confluence')) {
      estimate += 90;
    } else if (tab.url.includes('figma.com') || tab.url.includes('canva.com')) {
      estimate += 120;
    } else if (tab.url.includes('netflix.com') || tab.url.includes('hulu.com') || tab.url.includes('primevideo.com')) {
      estimate += 180;
    } else if (tab.url.includes('spotify.com') || tab.url.includes('music')) {
      estimate += 60;
    } else if (tab.url.includes('discord.com') || tab.url.includes('slack.com')) {
      estimate += 85;
    } else if (tab.url.includes('maps.google.com') || tab.url.includes('maps')) {
      estimate += 110;
    }

    // Title-based adjustments
    if (tab.title) {
      const title = tab.title.toLowerCase();
      if (title.includes('dashboard') || title.includes('admin')) {
        estimate += 25;
      }
      if (title.includes('editor') || title.includes('ide')) {
        estimate += 30;
      }
      if (title.includes('meeting') || title.includes('zoom') || title.includes('teams')) {
        estimate += 100;
      }
    }

    // Audible tabs use more memory
    if (tab.audible) {
      estimate += 50;
    }

    // Pinned tabs might be heavier
    if (tab.pinned) {
      estimate += 20;
    }

    return Math.min(estimate, 300); // Cap at 300MB
  }
}

// Global function for suggestion buttons
async function suspendSuggestedTab(tabId) {
  try {
    await chrome.runtime.sendMessage({ action: 'suspendTab', tabId });
    // Remove the suggestion item
    event.target.closest('.suggestion-item').remove();
    
    // Hide suggestions if no more items
    const suggestionList = document.getElementById('suggestion-list');
    if (suggestionList.children.length === 0) {
      document.getElementById('suggestions').style.display = 'none';
    }
    
    // Update stats
    setTimeout(() => {
      if (window.popupManager) {
        window.popupManager.updateStats().then(() => {
          window.popupManager.updateUI();
        });
      }
    }, 500);
  } catch (error) {
    console.error('Error suspending suggested tab:', error);
  }
}

// Initialize popup
window.popupManager = new PopupManager();