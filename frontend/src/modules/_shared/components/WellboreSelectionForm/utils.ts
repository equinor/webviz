// Extract block name from well identifier (e.g., "NO 16/2-D-38" -> "16/2")
export function extractBlockFromWellName(wellName: string): string {
    // Match common Norwegian Continental Shelf patterns:
    // - "NO 16/2-D-38" or "16/2-D-38" where "16/2" is the block
    // - "16/2-1" where "16/2" is the block
    // - "PL123-A-1H" where "PL123" could be considered the block

    // First try: Standard NCS format with block/quadrant
    let match = wellName.match(/(?:NO\s+)?(\d+\/\d+)-/);
    if (match) {
        return match[1]; // Return the block part (e.g., "16/2")
    }

    // Second try: Production License format
    match = wellName.match(/(PL\s*\d+[A-Z]*)-/);
    if (match) {
        return match[1]; // Return PL identifier (e.g., "PL123")
    }

    // Third try: Other numeric block formats
    match = wellName.match(/(\d+\/\d+\w*)-/);
    if (match) {
        return match[1];
    }

    // If no standard format, return "Other" for grouping
    return "Other";
}
