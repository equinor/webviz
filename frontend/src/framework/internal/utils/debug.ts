const DEBUG_FLAG_PREFIX = "webviz-debug:";

/**
 * Checks if a stored debug flag is true (as in, "true" or "1", case insensitive)
 * @param flag a debug flag key
 * @returns
 */
export function debugFlagIsEnabled(flag: string) {
    const storedFlag = localStorage.getItem(DEBUG_FLAG_PREFIX + flag);

    if (!storedFlag) return false;
    return ["true", "1"].includes(storedFlag.toLowerCase());
}

/**
 * Passes a given time, unless the `disable-tanstack-cache` debug flag is true
 * @param time time (ms) that the cache is valid for
 * @returns the given time, or 0 if the debug flag is enabled
 */
export function tanstackDebugTimeOverride(time: number) {
    if (debugFlagIsEnabled("disable-tanstack-cache")) return 0;
    return time;
}
