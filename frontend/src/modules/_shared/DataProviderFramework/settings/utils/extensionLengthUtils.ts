import { isWellboreIntersectionType } from "@framework/types/intersection";

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
    if (isWellboreIntersectionType(intersection?.type)) {
        return intersection.extensionLength ?? fallbackExtensionLength;
    }
    return fallbackExtensionLength;
}
