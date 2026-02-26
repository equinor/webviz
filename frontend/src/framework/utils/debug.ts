const DEBUG_FLAG_PREFIX = "webvizDebug_";

/**
 * Flag to show debug modules in the modules list
 */
export const SHOW_DEBUG_MODULES_FLAG = "showDebugModules";

/**
 * Checks if a stored debug flag is true (as in, "true" or "1", case insensitive)
 * @param flag a debug flag key
 * @returns true if the debug flag is enabled
 */
export function debugFlagIsEnabled(flag: string): boolean {
    const storedFlag = localStorage.getItem(DEBUG_FLAG_PREFIX + flag);

    if (!storedFlag) return false;
    return ["true", "1"].includes(storedFlag.toLowerCase());
}

/**
 * Gets a stored debug setting value
 * @param setting a debug setting key
 * @returns the value of the debug setting, or null if not set
 */
export function getDebugSetting(setting: string): string | null {
    const storedSetting = localStorage.getItem(DEBUG_FLAG_PREFIX + setting);
    if (storedSetting === null) return null;
    return storedSetting;
}

/**
 * Sets a debug setting value
 * @param setting a debug setting key
 * @param value the value to set, or null to remove the setting
 */
export function setDebugSetting(setting: string, value: string | null): void {
    if (value === null) {
        localStorage.removeItem(DEBUG_FLAG_PREFIX + setting);
    } else {
        localStorage.setItem(DEBUG_FLAG_PREFIX + setting, value);
    }
}

/**
 * Passes a given time, unless the `disable-tanstack-cache` debug flag is true
 * @param time time (ms) that the cache is valid for
 * @returns the given time, or 0 if the debug flag is enabled
 */
export function tanstackDebugTimeOverride(time: number): number {
    if (debugFlagIsEnabled("disableTanstackCache")) return 0;
    return time;
}
