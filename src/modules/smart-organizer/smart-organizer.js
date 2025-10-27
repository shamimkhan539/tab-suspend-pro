// Smart Tab Organization Module for BrowserGuard Pro
class SmartTabOrganizer {
    constructor() {
        this.workspaceProfiles = new Map();
        this.autoGroupRules = [];
        this.tabStacks = new Map();
        this.currentProfile = "default";
        this.init();
    }

    async init() {
        await this.loadOrganizationData();
        this.setupDefaultRules();
        console.log("Smart Tab Organizer initialized");
    }

    async loadOrganizationData() {
        try {
            const data = await chrome.storage.local.get([
                "workspaceProfiles",
                "autoGroupRules",
                "tabStacks",
                "currentProfile",
            ]);

            if (data.workspaceProfiles) {
                this.workspaceProfiles = new Map(
                    Object.entries(data.workspaceProfiles)
                );
            }
            if (data.autoGroupRules) {
                this.autoGroupRules = data.autoGroupRules;
            }
            if (data.tabStacks) {
                this.tabStacks = new Map(Object.entries(data.tabStacks));
            }
            if (data.currentProfile) {
                this.currentProfile = data.currentProfile;
            }

            // Create default profiles if none exist
            if (this.workspaceProfiles.size === 0) {
                await this.createDefaultProfiles();
            }
        } catch (error) {
            console.error("Error loading organization data:", error);
        }
    }

    async saveOrganizationData() {
        try {
            await chrome.storage.local.set({
                workspaceProfiles: Object.fromEntries(this.workspaceProfiles),
                autoGroupRules: this.autoGroupRules,
                tabStacks: Object.fromEntries(this.tabStacks),
                currentProfile: this.currentProfile,
            });
        } catch (error) {
            console.error("Error saving organization data:", error);
        }
    }

    // Workspace Profiles: Switch between different tab configurations
    async createDefaultProfiles() {
        const profiles = [
            {
                id: "personal",
                name: "Personal",
                description: "Personal browsing and entertainment",
                color: "blue",
                autoGroupRules: [
                    {
                        pattern: "*youtube.com*",
                        groupName: "Entertainment",
                        color: "red",
                    },
                    {
                        pattern: "*reddit.com*",
                        groupName: "Social",
                        color: "orange",
                    },
                    {
                        pattern: "*netflix.com*",
                        groupName: "Entertainment",
                        color: "red",
                    },
                ],
                suspendRules: {
                    enabled: true,
                    timeout: 45, // minutes
                },
            },
            {
                id: "work",
                name: "Work",
                description: "Professional work environment",
                color: "green",
                autoGroupRules: [
                    {
                        pattern: "*github.com*",
                        groupName: "Development",
                        color: "grey",
                    },
                    {
                        pattern: "*stackoverflow.com*",
                        groupName: "Development",
                        color: "grey",
                    },
                    {
                        pattern: "*docs.google.com*",
                        groupName: "Documents",
                        color: "blue",
                    },
                    {
                        pattern: "*slack.com*",
                        groupName: "Communication",
                        color: "purple",
                    },
                    {
                        pattern: "*teams.microsoft.com*",
                        groupName: "Communication",
                        color: "purple",
                    },
                ],
                suspendRules: {
                    enabled: true,
                    timeout: 20, // minutes
                },
            },
            {
                id: "research",
                name: "Research",
                description: "Research and learning",
                color: "purple",
                autoGroupRules: [
                    { domainGroup: true, groupName: "Domain Research" },
                    {
                        pattern: "*wikipedia.org*",
                        groupName: "Reference",
                        color: "cyan",
                    },
                    {
                        pattern: "*scholar.google.com*",
                        groupName: "Academic",
                        color: "green",
                    },
                    {
                        pattern: "*arxiv.org*",
                        groupName: "Academic",
                        color: "green",
                    },
                ],
                suspendRules: {
                    enabled: false, // Don't suspend research tabs
                },
            },
        ];

        for (const profile of profiles) {
            this.workspaceProfiles.set(profile.id, profile);
        }

        await this.saveOrganizationData();
    }

    async switchProfile(profileId) {
        // Ensure workspaceProfiles is initialized as a Map
        if (
            !this.workspaceProfiles ||
            !(this.workspaceProfiles instanceof Map)
        ) {
            this.workspaceProfiles = new Map();
        }

        if (!this.workspaceProfiles.has(profileId)) {
            throw new Error(`Profile ${profileId} not found`);
        }

        this.currentProfile = profileId;
        const profile = this.workspaceProfiles.get(profileId);

        // Apply profile rules to current tabs
        await this.applyProfileRules(profile);

        await this.saveOrganizationData();

        // Notify about profile switch
        chrome.notifications.create({
            type: "basic",
            iconUrl: "ui/assets/icons/icon48.png",
            title: "BrowserGuard Pro",
            message: `Switched to ${profile.name} profile`,
        });

        return profile;
    }

    async applyProfileRules(profile) {
        const tabs = await chrome.tabs.query({});
        const groupMap = new Map();

        for (const tab of tabs) {
            if (
                !tab.url ||
                tab.url.startsWith("chrome://") ||
                tab.url.startsWith("chrome-extension://")
            ) {
                continue;
            }

            const matchingRule = this.findMatchingRule(
                tab.url,
                profile.autoGroupRules
            );
            if (matchingRule) {
                const groupName = matchingRule.domainGroup
                    ? this.extractDomain(tab.url)
                    : matchingRule.groupName;

                if (!groupMap.has(groupName)) {
                    groupMap.set(groupName, {
                        tabs: [],
                        color: matchingRule.color || "grey",
                        rule: matchingRule,
                    });
                }

                groupMap.get(groupName).tabs.push(tab);
            }
        }

        // Create groups
        for (const [groupName, groupData] of groupMap) {
            if (groupData.tabs.length > 1) {
                await this.createTabGroup(
                    groupName,
                    groupData.tabs,
                    groupData.color
                );
            }
        }
    }

    // Auto-Grouping: Automatically group tabs by domain, content type, or time opened
    setupDefaultRules() {
        if (this.autoGroupRules.length === 0) {
            this.autoGroupRules = [
                // Domain-based grouping
                {
                    type: "domain",
                    pattern: "*google.com*",
                    groupName: "Google Services",
                    color: "blue",
                },
                {
                    type: "domain",
                    pattern: "*microsoft.com*",
                    groupName: "Microsoft",
                    color: "cyan",
                },
                {
                    type: "domain",
                    pattern: "*github.com*",
                    groupName: "GitHub",
                    color: "grey",
                },

                // Content type grouping
                {
                    type: "content",
                    pattern: "*youtube.com*",
                    groupName: "Video",
                    color: "red",
                },
                {
                    type: "content",
                    pattern: "*netflix.com*",
                    groupName: "Video",
                    color: "red",
                },
                {
                    type: "content",
                    pattern: "*twitch.tv*",
                    groupName: "Video",
                    color: "red",
                },

                // Shopping grouping
                {
                    type: "content",
                    pattern: "*amazon.com*",
                    groupName: "Shopping",
                    color: "orange",
                },
                {
                    type: "content",
                    pattern: "*ebay.com*",
                    groupName: "Shopping",
                    color: "orange",
                },
                {
                    type: "content",
                    pattern: "*etsy.com*",
                    groupName: "Shopping",
                    color: "orange",
                },

                // Social media grouping
                {
                    type: "content",
                    pattern: "*facebook.com*",
                    groupName: "Social",
                    color: "purple",
                },
                {
                    type: "content",
                    pattern: "*twitter.com*",
                    groupName: "Social",
                    color: "purple",
                },
                {
                    type: "content",
                    pattern: "*instagram.com*",
                    groupName: "Social",
                    color: "purple",
                },
                {
                    type: "content",
                    pattern: "*linkedin.com*",
                    groupName: "Social",
                    color: "purple",
                },
            ];
        }
    }

    async autoGroupNewTab(tab) {
        if (
            !tab.url ||
            tab.url.startsWith("chrome://") ||
            tab.url.startsWith("chrome-extension://")
        ) {
            return;
        }

        const currentProfile = this.workspaceProfiles.get(this.currentProfile);
        if (!currentProfile) return;

        const matchingRule = this.findMatchingRule(
            tab.url,
            currentProfile.autoGroupRules
        );
        if (matchingRule) {
            const groupName = matchingRule.domainGroup
                ? this.extractDomain(tab.url)
                : matchingRule.groupName;

            // Check if group already exists
            const existingGroups = await chrome.tabGroups.query({
                windowId: tab.windowId,
            });
            const existingGroup = existingGroups.find(
                (g) => g.title === groupName
            );

            if (existingGroup) {
                // Add to existing group
                await chrome.tabs.group({
                    tabIds: [tab.id],
                    groupId: existingGroup.id,
                });
            } else {
                // Create new group
                const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
                await chrome.tabGroups.update(groupId, {
                    title: groupName,
                    color: matchingRule.color || "grey",
                });
            }
        }
    }

    // Tab Stacking: Stack related tabs to reduce visual clutter
    async createTabStack(name, tabIds) {
        try {
            if (tabIds.length < 2) {
                throw new Error("Need at least 2 tabs to create a stack");
            }

            const stackId = this.generateStackId();
            const tabs = await Promise.all(
                tabIds.map((id) => chrome.tabs.get(id))
            );

            const stack = {
                id: stackId,
                name: name,
                createdAt: Date.now(),
                tabs: tabs.map((tab) => ({
                    id: tab.id,
                    url: tab.url,
                    title: tab.title,
                    favIconUrl: tab.favIconUrl,
                })),
                activeTabIndex: 0,
            };

            this.tabStacks.set(stackId, stack);

            // Group the tabs
            const groupId = await chrome.tabs.group({ tabIds });
            await chrome.tabGroups.update(groupId, {
                title: `📚 ${name}`,
                color: "yellow",
                collapsed: true,
            });

            await this.saveOrganizationData();
            return stack;
        } catch (error) {
            console.error("Error creating tab stack:", error);
            throw error;
        }
    }

    // Tab Bookmarking: Convert tab groups to organized bookmark folders
    async convertGroupToBookmarks(groupId) {
        try {
            const group = await chrome.tabGroups.get(groupId);
            const tabs = await chrome.tabs.query({ groupId });

            // Create bookmark folder
            const folder = await chrome.bookmarks.create({
                title: `${group.title} - ${new Date().toLocaleDateString()}`,
                parentId: "1", // Bookmarks bar
            });

            // Add bookmarks for each tab
            for (const tab of tabs) {
                if (
                    tab.url &&
                    !tab.url.startsWith("chrome://") &&
                    !tab.url.startsWith("chrome-extension://")
                ) {
                    await chrome.bookmarks.create({
                        title: tab.title || "Untitled",
                        url: tab.url,
                        parentId: folder.id,
                    });
                }
            }

            // Optionally close the group after bookmarking
            chrome.notifications.create({
                type: "basic",
                iconUrl: "ui/assets/icons/icon48.png",
                title: "BrowserGuard Pro",
                message: `Bookmarked ${tabs.length} tabs from "${group.title}"`,
            });

            return folder;
        } catch (error) {
            console.error("Error converting group to bookmarks:", error);
            throw error;
        }
    }

    // Smart grouping by time opened
    async groupByTimeOpened(windowId = null) {
        const tabs = await chrome.tabs.query(windowId ? { windowId } : {});
        const now = Date.now();
        const timeGroups = new Map();

        // Group tabs by when they were opened (approximate)
        for (const tab of tabs) {
            if (
                tab.url.startsWith("chrome://") ||
                tab.url.startsWith("chrome-extension://")
            )
                continue;

            let timeGroup;
            const tabAge = now - (tab.lastAccessed || now);

            if (tabAge < 30 * 60 * 1000) {
                // Less than 30 minutes
                timeGroup = "Recent";
            } else if (tabAge < 2 * 60 * 60 * 1000) {
                // Less than 2 hours
                timeGroup = "Last Hour";
            } else if (tabAge < 24 * 60 * 60 * 1000) {
                // Less than 24 hours
                timeGroup = "Today";
            } else {
                timeGroup = "Older";
            }

            if (!timeGroups.has(timeGroup)) {
                timeGroups.set(timeGroup, []);
            }
            timeGroups.get(timeGroup).push(tab);
        }

        // Create groups for each time category
        const colors = ["green", "blue", "orange", "grey"];
        let colorIndex = 0;

        for (const [timeName, groupTabs] of timeGroups) {
            if (groupTabs.length > 1) {
                await this.createTabGroup(
                    `🕒 ${timeName}`,
                    groupTabs,
                    colors[colorIndex % colors.length]
                );
                colorIndex++;
            }
        }
    }

    // Utility methods
    findMatchingRule(url, rules) {
        for (const rule of rules) {
            if (this.matchesPattern(url, rule.pattern)) {
                return rule;
            }
        }
        return null;
    }

    matchesPattern(url, pattern) {
        if (!pattern) return false;

        // Convert glob pattern to regex
        const regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");

        return new RegExp(regexPattern, "i").test(url);
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname.replace("www.", "");
        } catch {
            return "Unknown";
        }
    }

    async createTabGroup(name, tabs, color = "grey") {
        try {
            const tabIds = tabs.map((t) => t.id);
            const groupId = await chrome.tabs.group({ tabIds });
            await chrome.tabGroups.update(groupId, {
                title: name,
                color: color,
            });
            return groupId;
        } catch (error) {
            console.error("Error creating tab group:", error);
        }
    }

    generateStackId() {
        return `stack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // API methods for UI
    async getProfiles() {
        return Array.from(this.workspaceProfiles.values());
    }

    async getCurrentProfile() {
        return this.workspaceProfiles.get(this.currentProfile);
    }

    async createProfile(name, description, rules = []) {
        const profile = {
            id: name.toLowerCase().replace(/\s+/g, "_"),
            name: name,
            description: description,
            color: "blue",
            autoGroupRules: rules,
            suspendRules: {
                enabled: true,
                timeout: 30,
            },
        };

        this.workspaceProfiles.set(profile.id, profile);
        await this.saveOrganizationData();
        return profile;
    }

    async deleteProfile(profileId) {
        if (profileId === "default") {
            throw new Error("Cannot delete default profile");
        }

        this.workspaceProfiles.delete(profileId);
        if (this.currentProfile === profileId) {
            this.currentProfile = "default";
        }

        await this.saveOrganizationData();
    }

    async getTabStacks() {
        return Array.from(this.tabStacks.values());
    }

    async deleteTabStack(stackId) {
        this.tabStacks.delete(stackId);
        await this.saveOrganizationData();
    }
}

// Export for use in background script
if (typeof module !== "undefined" && module.exports) {
    module.exports = SmartTabOrganizer;
}
