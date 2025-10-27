#!/usr/bin/env node

/**
 * Changelog Updater Script for BrowserGuard Pro
 *
 * This script helps maintain the changelog by:
 * 1. Adding new version entries to CHANGELOG.md
 * 2. Updating the latest version info in README.md
 * 3. Ensuring consistent formatting across both files
 *
 * Usage: node update-changelog.js [version] [type] [description]
 * Example: node update-changelog.js "2.1.0" "Added" "New AI-powered suspension feature"
 */

const fs = require("fs");
const path = require("path");

class ChangelogUpdater {
    constructor() {
        this.changelogPath = path.join(__dirname, "CHANGELOG.md");
        this.readmePath = path.join(__dirname, "readme.md");
        this.today = new Date().toISOString().split("T")[0];
    }

    /**
     * Add a new entry to the changelog
     * @param {string} version - Version number (e.g., "2.1.0")
     * @param {string} type - Change type (Added, Fixed, Changed, etc.)
     * @param {string} description - Description of the change
     */
    addChangelogEntry(version, type, description) {
        try {
            const changelog = fs.readFileSync(this.changelogPath, "utf8");

            const newEntry = `## [${version}] - ${this.today}

### ${type}
- ${description}

`;

            // Insert after the header, before the first existing version
            const headerEnd = changelog.indexOf("\n## [");
            if (headerEnd === -1) {
                // No existing versions, add after the main header
                const insertPoint = changelog.indexOf("\n\n") + 2;
                const updated =
                    changelog.slice(0, insertPoint) +
                    newEntry +
                    changelog.slice(insertPoint);
                fs.writeFileSync(this.changelogPath, updated);
            } else {
                const updated =
                    changelog.slice(0, headerEnd + 1) +
                    newEntry +
                    changelog.slice(headerEnd + 1);
                fs.writeFileSync(this.changelogPath, updated);
            }

            console.log(`✅ Added changelog entry for version ${version}`);
            return true;
        } catch (error) {
            console.error("❌ Error updating changelog:", error.message);
            return false;
        }
    }

    /**
     * Update the README with the latest version info
     * @param {string} version - Version number
     * @param {string} highlights - Key highlights for this version
     */
    updateReadmeVersion(version, highlights) {
        try {
            let readme = fs.readFileSync(this.readmePath, "utf8");

            // Find and update the version section
            const versionPattern = /### Version [\d\.]+.*?\n/;
            const newVersionHeader = `### Version ${version} (Latest) - ${this.formatDate(
                this.today
            )}\n\n${highlights}\n\n`;

            if (versionPattern.test(readme)) {
                readme = readme.replace(versionPattern, newVersionHeader);
            } else {
                // Insert after "## 🔄 Updates & Changelog"
                const insertPoint =
                    readme.indexOf("## 🔄 Updates & Changelog\n") +
                    "## 🔄 Updates & Changelog\n".length;
                readme =
                    readme.slice(0, insertPoint) +
                    "\n" +
                    newVersionHeader +
                    readme.slice(insertPoint);
            }

            fs.writeFileSync(this.readmePath, readme);
            console.log(`✅ Updated README with version ${version}`);
            return true;
        } catch (error) {
            console.error("❌ Error updating README:", error.message);
            return false;
        }
    }

    /**
     * Format date for display
     * @param {string} dateStr - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    /**
     * Interactive mode for adding changelog entries
     */
    interactive() {
        const readline = require("readline");
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        console.log("🚀 BrowserGuard Pro Changelog Updater\n");

        rl.question("Version number (e.g., 2.1.0): ", (version) => {
            rl.question(
                "Change type (Added/Fixed/Changed/Removed): ",
                (type) => {
                    rl.question("Description: ", (description) => {
                        this.addChangelogEntry(version, type, description);

                        rl.question(
                            "Add version highlights to README? (y/n): ",
                            (addToReadme) => {
                                if (addToReadme.toLowerCase() === "y") {
                                    rl.question(
                                        "Version highlights: ",
                                        (highlights) => {
                                            this.updateReadmeVersion(
                                                version,
                                                highlights
                                            );
                                            rl.close();
                                        }
                                    );
                                } else {
                                    rl.close();
                                }
                            }
                        );
                    });
                }
            );
        });
    }
}

// Command line usage
const args = process.argv.slice(2);

if (args.length === 0) {
    // Interactive mode
    new ChangelogUpdater().interactive();
} else if (args.length >= 3) {
    // Command line mode
    const [version, type, description] = args;
    const updater = new ChangelogUpdater();
    updater.addChangelogEntry(version, type, description);
} else {
    console.log(
        "Usage: node update-changelog.js [version] [type] [description]"
    );
    console.log("   or: node update-changelog.js (for interactive mode)");
    console.log("");
    console.log("Examples:");
    console.log(
        '  node update-changelog.js "2.1.0" "Added" "New AI-powered suspension feature"'
    );
    console.log(
        '  node update-changelog.js "2.0.1" "Fixed" "Button overlap issue resolved"'
    );
}

module.exports = ChangelogUpdater;
