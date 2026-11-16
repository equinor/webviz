import { describe, expect, test } from "vitest";

import type { Grid3dInfo_api } from "@api";
import {
    getAvailableTimeTypes,
    getGridTimeOrIntervalStr,
    gridTimeToIsoDateTime,
    isGridTimeSelectionValid,
    isoDateTimeToGridTime,
    makeGridPropertyTimeInfo,
} from "@modules/_shared/DataProviderFramework/dataProviders/dependencyFunctions/gridPropertyTimeFunctions";
import { TimeType } from "@modules/_shared/DataProviderFramework/settings/implementations/TimeTypeSetting";

const TIME_POINT = "2018-01-01T00:00:00";
const TIME_INTERVAL = "2018-01-01T00:00:00/2020-07-01T00:00:00";
const TIME_POINT_PAIR: [string, string] = ["2018-01-01T00:00:00", "2020-07-01T00:00:00"];

describe("grid time format conversion", () => {
    test.each([
        ["2018-01-01", "2018-01-01T00:00:00"],
        ["2018-01-01/2020-07-01", "2018-01-01T00:00:00/2020-07-01T00:00:00"],
    ])("%s round-trips through %s", (gridTime, isoDateTime) => {
        expect(gridTimeToIsoDateTime(gridTime)).toBe(isoDateTime);
        expect(isoDateTimeToGridTime(isoDateTime)).toBe(gridTime);
    });

    test("an already converted value is left unchanged", () => {
        expect(gridTimeToIsoDateTime("2018-01-01T00:00:00")).toBe("2018-01-01T00:00:00");
    });
});

describe("makeGridPropertyTimeInfo", () => {
    test("splits property times into static, date-time points and date-time intervals", () => {
        const gridModelInfoArr = [
            {
                grid_name: "Geogrid",
                property_info_arr: [
                    { property_name: "PRESSURE", iso_date_or_interval: "2020-07-01" },
                    { property_name: "PRESSURE", iso_date_or_interval: "2018-01-01" },
                    { property_name: "PRESSURE", iso_date_or_interval: "2018-01-01/2020-07-01" },
                    { property_name: "PRESSURE", iso_date_or_interval: null },
                    { property_name: "PORO", iso_date_or_interval: "2019-01-01" },
                ],
            },
        ] as unknown as Grid3dInfo_api[];

        expect(makeGridPropertyTimeInfo(gridModelInfoArr, "Geogrid", "PRESSURE")).toEqual({
            hasStatic: true,
            timePoints: ["2018-01-01T00:00:00", "2020-07-01T00:00:00"],
            intervals: ["2018-01-01T00:00:00/2020-07-01T00:00:00"],
        });
    });
});

describe("getAvailableTimeTypes", () => {
    test("offers a computed interval only with at least two time points", () => {
        expect(getAvailableTimeTypes({ hasStatic: false, timePoints: [TIME_POINT], intervals: [] })).toEqual([
            TimeType.TIME_POINT,
        ]);
        expect(
            getAvailableTimeTypes({ hasStatic: true, timePoints: TIME_POINT_PAIR, intervals: [TIME_INTERVAL] }),
        ).toEqual([TimeType.NO_TIME, TimeType.TIME_POINT, TimeType.INTERVAL, TimeType.COMPUTED_INTERVAL]);
    });
});

describe("isGridTimeSelectionValid", () => {
    test.each([
        [TimeType.NO_TIME, null, null, null, true],
        [TimeType.TIME_POINT, TIME_POINT, null, null, true],
        [TimeType.TIME_POINT, null, TIME_INTERVAL, TIME_POINT_PAIR, false],
        [TimeType.INTERVAL, null, TIME_INTERVAL, null, true],
        [TimeType.INTERVAL, TIME_POINT, null, TIME_POINT_PAIR, false],
        [TimeType.COMPUTED_INTERVAL, null, null, TIME_POINT_PAIR, true],
        [TimeType.COMPUTED_INTERVAL, TIME_POINT, TIME_INTERVAL, null, false],
        [null, TIME_POINT, TIME_INTERVAL, TIME_POINT_PAIR, false],
    ] as const)("%s with point=%s interval=%s pair=%s is %s", (timeType, timePoint, timeInterval, pair, expected) => {
        expect(isGridTimeSelectionValid(timeType, timePoint, timeInterval, pair as [string, string] | null)).toBe(
            expected,
        );
    });
});

describe("getGridTimeOrIntervalStr", () => {
    test("returns the selected time point or interval in the grid's date format", () => {
        expect(getGridTimeOrIntervalStr(TimeType.TIME_POINT, TIME_POINT, TIME_INTERVAL)).toBe("2018-01-01");
        expect(getGridTimeOrIntervalStr(TimeType.INTERVAL, TIME_POINT, TIME_INTERVAL)).toBe("2018-01-01/2020-07-01");
    });

    test("returns null for static, computed intervals and missing values", () => {
        expect(getGridTimeOrIntervalStr(TimeType.NO_TIME, TIME_POINT, TIME_INTERVAL)).toBeNull();
        expect(getGridTimeOrIntervalStr(TimeType.COMPUTED_INTERVAL, TIME_POINT, TIME_INTERVAL)).toBeNull();
        expect(getGridTimeOrIntervalStr(TimeType.TIME_POINT, null, TIME_INTERVAL)).toBeNull();
        expect(getGridTimeOrIntervalStr(null, TIME_POINT, TIME_INTERVAL)).toBeNull();
    });
});
