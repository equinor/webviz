import { getDevModeOverride } from "@framework/utils/debug";

export function isDevMode(): boolean {
    const override = getDevModeOverride();
    if (override !== null) return override;

    return process.env.NODE_ENV === "development";
}
