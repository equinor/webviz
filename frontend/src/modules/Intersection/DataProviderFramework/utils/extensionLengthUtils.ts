import type { Intersection } from "@framework/types/intersection";
import { IntersectionType } from "@framework/types/intersection";

export function createValidExtensionLength(
    intersection: Intersection | null,
    wellboreExtensionLength: number | null,
): number {
    if (intersection?.type === IntersectionType.WELLBORE) {
        return wellboreExtensionLength ?? 0;
    }
    return 0;
}
