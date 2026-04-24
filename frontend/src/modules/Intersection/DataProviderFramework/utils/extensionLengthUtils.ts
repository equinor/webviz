import { IntersectionType } from "@framework/types/intersection";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";

export function createValidExtensionLength(intersection: IntersectionSettingValue | null): number {
    if (intersection?.type === IntersectionType.WELLBORE) {
        return intersection.extensionLength ?? 0;
    }
    return 0;
}
