const DEBUG_FLAG_PREFIX = "webviz-debug:";

/**
 * Passes a given time, unless the `disable-tanstack-cache` debug flag is true
 * @param time time (ms) that the cache is valid for
 * @returns
 */
export function tanstackCacheTime(time: number) {
    const cacheFlag = localStorage.getItem(DEBUG_FLAG_PREFIX + "disable-tanstack-cache");

    if (!cacheFlag || ["true", true, 1].includes(cacheFlag)) return 0;

    return time;
}
