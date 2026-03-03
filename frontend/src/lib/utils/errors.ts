const REPO_URL = "https://github.com/equinor/webviz";

export function reportErrorToGithub(error: Error, customStackReport?: string): void {
    // Explicitly using OR operatior here to avoid empty strings
    const stackToReport = customStackReport || error.stack || "";

    const errorMessage = `${error.name}: ${error.message}`;
    const title = encodeURIComponent(`[USER REPORTED ERROR] ${errorMessage}`);
    const body = encodeURIComponent(
        `<!-- ⚠️ DO NOT INCLUDE DATA/SCREENSHOTS THAT CAN'T BE PUBLICLY AVAILABLE.-->\n\n\
**How to reproduce**\nPlease describe what you were doing when the error occurred.\n\n\
**Screenshots**\nIf applicable, add screenshots to help explain your problem.\n\n\
**Error stack**\n\`\`\`\n${stackToReport}\n\`\`\``,
    );
    const label = encodeURIComponent("user reported error");
    window.open(`${REPO_URL}/issues/new?title=${title}&body=${body}&labels=${label}`, "_blank");
}
