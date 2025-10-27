// Suspended page script for Tab Suspend Pro
(function () {
    "use strict";

    let originalUrl = "";
    let originalTitle = "";
    let faviconUrl = "";

    // Parse URL parameters
    function parseUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        originalUrl = urlParams.get("url") || "";
        originalTitle = urlParams.get("title") || "Unknown Page";
        faviconUrl = urlParams.get("favicon") || "";
    }

    // Update page elements
    function updatePageContent() {
        document.title = "💤 " + originalTitle;

        const titleElement = document.getElementById("tab-title");
        const urlElement = document.getElementById("tab-url");
        const faviconElement = document.getElementById("favicon");

        if (titleElement) titleElement.textContent = originalTitle;
        if (urlElement) urlElement.textContent = originalUrl;

        // Set favicon
        if (faviconElement) {
            if (faviconUrl && faviconUrl !== "null" && faviconUrl !== "") {
                faviconElement.src = faviconUrl;
            } else {
                faviconElement.src =
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJjdXJyZW50Q29sb3IiLz4KPC9zdmc+";
            }
        }
    }

    // Estimate memory saved
    function estimateMemorySaved() {
        let estimate = 50; // Base estimate

        if (originalUrl) {
            if (
                originalUrl.includes("youtube.com") ||
                originalUrl.includes("video")
            ) {
                estimate += 100;
            } else if (
                originalUrl.includes("docs.google.com") ||
                originalUrl.includes("office.com")
            ) {
                estimate += 75;
            } else if (
                originalUrl.includes("github.com") ||
                originalUrl.includes("stackoverflow.com")
            ) {
                estimate += 30;
            }
        }

        const memoryElement = document.getElementById("memory-estimate");
        if (memoryElement) {
            memoryElement.textContent = "~" + estimate + "MB";
        }
    }

    // Restore tab function
    function restoreTab() {
        if (originalUrl) {
            // First try to send message to background script for proper restoration
            try {
                chrome.runtime
                    .sendMessage({
                        action: "manualRestore",
                    })
                    .catch(() => {
                        // If extension communication fails, fallback to direct navigation
                        window.location.href = originalUrl;
                    });
            } catch (error) {
                // Fallback to direct navigation
                window.location.href = originalUrl;
            }
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        // Restore button click
        const restoreBtn = document.getElementById("restore-btn");
        if (restoreBtn) {
            restoreBtn.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                restoreTab();
            });
        }

        // Auto-restore on key press (Enter or Space) only when restore button is focused
        document.addEventListener("keydown", function (e) {
            if (
                (e.key === "Enter" || e.key === " ") &&
                document.activeElement ===
                    document.getElementById("restore-btn")
            ) {
                e.preventDefault();
                restoreTab();
            }
        });
    }

    // Initialize when DOM is loaded
    function init() {
        parseUrlParameters();
        updatePageContent();
        estimateMemorySaved();
        setupEventListeners();
    }

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
