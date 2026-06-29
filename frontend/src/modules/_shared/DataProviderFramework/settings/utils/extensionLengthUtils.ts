import { IntersectionType } from "@framework/types/intersection";

import type { IntersectionSettingValue } from "../implementations/IntersectionSetting";

/**
 * Create valid extension length for an intersection
 *
 * With a valid fallback extension length
 */
export function createValidExtensionLength(
    intersection: IntersectionSettingValue | null,
    fallbackExtensionLength = 0,
): number {
    if (
        intersection &&
        (intersection.type === IntersectionType.WELLBORE || intersection.type === IntersectionType.PLANNED_WELLBORE)
    ) {
        return intersection.extensionLength ?? fallbackExtensionLength;
    }
    return fallbackExtensionLength;
}
