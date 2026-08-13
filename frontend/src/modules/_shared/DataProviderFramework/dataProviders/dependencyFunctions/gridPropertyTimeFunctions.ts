import type { Grid3dInfo_api } from "@api";
import { sortTimeOrIntervalArray } from "@lib/utils/arrays";

import { TimeType } from "../../settings/implementations/TimeTypeSetting";

export type GridPropertyTimeInfo = {
    hasStatic: boolean;
    timePoints: string[];
    intervals: string[];
};

const EMPTY_TIME_INFO: GridPropertyTimeInfo = { hasStatic: false, timePoints: [], intervals: [] };

/**
 * Split the time values available for a grid property into static, time points and precomputed intervals.
 */
export function makeGridPropertyTimeInfo(
    gridModelInfoArr: Grid3dInfo_api[] | null,
    gridName: string | null,
    gridAttribute: string | null,
): GridPropertyTimeInfo {
    if (!gridModelInfoArr || !gridName || !gridAttribute) {
        return EMPTY_TIME_INFO;
    }

    const propertyInfoArr = gridModelInfoArr.find((info) => info.grid_name === gridName)?.property_info_arr ?? [];

    let hasStatic = false;
    const timePoints = new Set<string>();
    const intervals = new Set<string>();

    for (const propertyInfo of propertyInfoArr) {
        if (propertyInfo.property_name !== gridAttribute) {
            continue;
        }

        const isoDateOrInterval = propertyInfo.iso_date_or_interval;
        if (!isoDateOrInterval) {
            hasStatic = true;
        } else if (isoDateOrInterval.includes("/")) {
            // Grid property time values are date only, so an interval can only be recognized by its separator
            intervals.add(isoDateOrInterval);
        } else {
            timePoints.add(isoDateOrInterval);
        }
    }

    return {
        hasStatic,
        timePoints: sortTimeOrIntervalArray(Array.from(timePoints)),
        intervals: sortTimeOrIntervalArray(Array.from(intervals)),
    };
}

/**
 * Computed intervals require a backend endpoint that can diff two time steps, so they must be opted into.
 */
export function getAvailableTimeTypes(
    timeInfo: GridPropertyTimeInfo,
    options?: { allowComputedInterval?: boolean },
): TimeType[] {
    const availableTimeTypes: TimeType[] = [];

    if (timeInfo.hasStatic) {
        availableTimeTypes.push(TimeType.NO_TIME);
    }
    if (timeInfo.timePoints.length > 0) {
        availableTimeTypes.push(TimeType.TIME_POINT);
    }
    if (timeInfo.intervals.length > 0) {
        availableTimeTypes.push(TimeType.INTERVAL);
    }
    if (options?.allowComputedInterval && timeInfo.timePoints.length >= 2) {
        availableTimeTypes.push(TimeType.COMPUTED_INTERVAL);
    }

    return availableTimeTypes;
}
