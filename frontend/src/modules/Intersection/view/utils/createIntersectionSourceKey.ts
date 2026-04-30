import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";

export function createIntersectionSourceKey(intersectionSource: IntersectionSettingValue | null): string | null {
    return intersectionSource ? `${intersectionSource.type}:${intersectionSource.uuid}` : null;
}
