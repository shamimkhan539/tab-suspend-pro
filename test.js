// Test script for Tab Suspend Pro Extension
// This file helps verify that the extension is working correctly

console.log("Tab Suspend Pro - Test Script Loaded");

// Test extension functionality
async function testExtension() {
    console.log("🧪 Testing Tab Suspend Pro Extension");

    try {
        // Test if extension is loaded
        if (
            typeof chrome !== "undefined" &&
            chrome.runtime &&
            chrome.runtime.id
        ) {
            console.log("✅ Extension runtime detected");
            console.log("Extension ID:", chrome.runtime.id);
        } else {
            console.log("❌ Extension runtime not detected");
            return;
        }

        // Test messaging with background script
        try {
            const response = await chrome.runtime.sendMessage({
                action: "ping",
            });
            if (response && response.success) {
                console.log("✅ Background script communication successful");
            } else {
                console.log("❌ Background script communication failed");
            }
        } catch (error) {
            console.log("❌ Background script communication error:", error);
        }

        // Test storage access
        try {
            const settings = await chrome.storage.sync.get([
                "tabSuspendSettings",
            ]);
            console.log("✅ Storage access successful");
            console.log("Current settings:", settings);
        } catch (error) {
            console.log("❌ Storage access failed:", error);
        }

        // Test tab queries
        try {
            const tabs = await chrome.tabs.query({ currentWindow: true });
            console.log("✅ Tab query successful");
            console.log(`Found ${tabs.length} tabs in current window`);
        } catch (error) {
            console.log("❌ Tab query failed:", error);
        }

        console.log("🎉 Extension test completed");
    } catch (error) {
        console.error("Test failed:", error);
    }
}

// Run test when script loads
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", testExtension);
} else {
    testExtension();
}

// Export for manual testing
window.testTabSuspendPro = testExtension;
