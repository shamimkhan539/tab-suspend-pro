// Test Dashboard Functionality
// This file helps test the dashboard features without needing the full extension

// Mock chrome runtime for testing
window.chrome = window.chrome || {
    runtime: {
        sendMessage: async (message) => {
            console.log(
                "Mock chrome.runtime.sendMessage called with:",
                message
            );

            // Mock responses based on action
            switch (message.action) {
                case "dashboard-get-quick-stats":
                    return {
                        success: true,
                        stats: {
                            suspendedTabs: 23,
                            memorySaved: 268435456, // 256MB in bytes
                            activeSessions: 5,
                            performanceGain: 32,
                        },
                    };

                case "dashboard-get-features":
                    return {
                        success: true,
                        features: [
                            {
                                icon: "🔒",
                                title: "Auto Tab Suspension",
                                description:
                                    "Automatically suspend inactive tabs to save memory and improve performance",
                                status: "",
                            },
                            {
                                icon: "📋",
                                title: "Session Management",
                                description:
                                    "Save and restore tab sessions with templates for common workflows",
                                status: "",
                            },
                            {
                                icon: "🎯",
                                title: "Focus Mode",
                                description:
                                    "Block distracting websites and track productivity sessions",
                                status: "warning",
                            },
                            {
                                icon: "☁️",
                                title: "Cloud Sync",
                                description:
                                    "Backup and sync sessions across devices with cloud storage",
                                status: "",
                            },
                            {
                                icon: "📊",
                                title: "Analytics",
                                description:
                                    "Track usage patterns and productivity metrics with insights",
                                status: "",
                            },
                            {
                                icon: "🔒",
                                title: "Privacy Protection",
                                description:
                                    "GDPR-compliant data handling with encryption and retention policies",
                                status: "",
                            },
                        ],
                    };

                case "focus-get-status":
                    return {
                        success: true,
                        active: false,
                    };

                case "focus-start":
                case "focus-stop":
                    return {
                        success: true,
                    };

                case "saveCurrentSession":
                case "saveCompleteSession":
                    return {
                        success: true,
                        sessionId: "session_" + Date.now(),
                    };

                case "analytics-generate-report":
                    return {
                        success: true,
                        report: "<h1>Analytics Report</h1><p>Mock report generated successfully!</p>",
                    };

                case "privacy-export-data":
                    return {
                        success: true,
                        data: JSON.stringify({
                            version: "2.1.0",
                            exported: new Date().toISOString(),
                            sessions: [],
                            settings: {},
                            analytics: {},
                        }),
                    };

                case "cloud-create-backup":
                    return {
                        success: true,
                        backupId: "backup_" + Date.now(),
                    };

                case "resetAllSettings":
                    return {
                        success: true,
                    };

                default:
                    return {
                        success: false,
                        error: "Unknown action: " + message.action,
                    };
            }
        },
    },
    storage: {
        sync: {
            get: async (keys) => {
                console.log("Mock chrome.storage.sync.get called with:", keys);
                return {
                    theme: "light",
                };
            },
        },
    },
    action: {
        openPopup: () => {
            console.log("Mock chrome.action.openPopup called");
            alert("Popup would open here (mocked for testing)");
        },
    },
};

// Test functions
function testDashboard() {
    console.log("Testing Dashboard Functions...");

    // Test notification
    showNotification("Test notification - Success", "success");

    setTimeout(() => {
        showNotification("Test notification - Error", "error");
    }, 1000);

    setTimeout(() => {
        showNotification("Test notification - Info", "info");
    }, 2000);

    console.log("Dashboard test completed!");
}

// Auto-run test when page loads (after dashboard initializes)
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        console.log("Running dashboard tests...");
        testDashboard();
    }, 2000);
});

console.log("Dashboard test setup complete!");
