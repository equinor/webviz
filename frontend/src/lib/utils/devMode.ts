/**
 * `localStorage` key used to force dev mode on or off, overriding the build-time `NODE_ENV`
 * check. Consumed e.g. by the Playwright e2e suite to make the dev server behave like a
 * production build.
 *
 * The `webvizDebug_` prefix matches the debug-flag convention in `@framework/utils/debug`, but
 * this module lives in `@lib` (which must stay free of `@framework`/`@modules` deps), so the
 * value is read directly here instead of through that helper.
 */
const FORCE_DEV_MODE_STORAGE_KEY = "webvizDebug_forceToggleDevModeTo";

/**
 * Reads the force-dev-mode override from `localStorage`.
 *
 * Only the exact tokens `true`/`1` and `false`/`0` (case-insensitive) count as an explicit
 * override. An unset flag, an unrecognized value, or a browser/storage configuration where
 * reading `localStorage` throws all return `null`, so the caller falls back to the normal
 * `NODE_ENV` check rather than silently flipping dev mode.
 */
function getDevModeOverride(): boolean | null {
    let storedValue: string | null;
    try {
        storedValue = localStorage.getItem(FORCE_DEV_MODE_STORAGE_KEY);
    } catch {
        return null;
    }
    if (storedValue === null) return null;

    const normalized = storedValue.trim().toLowerCase();
    if (["true", "1"].includes(normalized)) return true;
    if (["false", "0"].includes(normalized)) return false;
    return null;
}

export function isDevMode(): boolean {
    const override = getDevModeOverride();
    if (override !== null) return override;

    return process.env.NODE_ENV === "development";
}
