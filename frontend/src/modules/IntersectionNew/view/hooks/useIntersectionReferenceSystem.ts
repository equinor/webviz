import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { useIntersectionPolylines } from "@framework/UserCreatedItems";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import { IntersectionType } from "@framework/types/intersection";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";

import { useWellboreTrajectoriesQuery } from "./queryHooks";

import {
    createIntersectionReferenceSystemFromIntersectionPolyline,
    createIntersectionReferenceSystemFromWellTrajectory,
} from "../utils/createIntersectionReferenceSystem";

/**
 * Create intersection reference system based on selected intersection setting
 */
export function useCreateIntersectionReferenceSystem(
    intersectionSetting: IntersectionSettingValue | null,
    fieldIdentifier: string | null,
    workbenchSession: WorkbenchSession,
): IntersectionReferenceSystem | null {
    // Always call hooks unconditionally
    const isCustomPolyline = intersectionSetting?.type === IntersectionType.CUSTOM_POLYLINE;
    const isWellbore = intersectionSetting?.type === IntersectionType.WELLBORE;

    // Polyline intersection
    const availableIntersectionPolylines = useIntersectionPolylines(workbenchSession);

    // Wellbore intersection
    const wellboreUuid = isWellbore ? intersectionSetting.uuid : "";
    const wellTrajectoriesQuery = useWellboreTrajectoriesQuery(
        fieldIdentifier,
        isWellbore ? [wellboreUuid] : [],
        isWellbore,
    );

    // Return early if we don't have a valid intersection setting
    if (!intersectionSetting) {
        return null;
    }

    // Process the results after all hooks have been called
    if (isWellbore && wellTrajectoriesQuery.data && wellTrajectoriesQuery.data.length > 0) {
        return createIntersectionReferenceSystemFromWellTrajectory(wellTrajectoriesQuery.data[0]);
    }

    if (isCustomPolyline) {
        const polyline = availableIntersectionPolylines.getPolyline(intersectionSetting.uuid);
        if (polyline) {
            return createIntersectionReferenceSystemFromIntersectionPolyline(polyline);
        }
    }

    return null;
}
