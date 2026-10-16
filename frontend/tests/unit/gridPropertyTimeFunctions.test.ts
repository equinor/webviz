import { describe, expect, test } from "vitest";

import type { Grid3dInfo_api } from "@api";
import {
    gridTimeToIsoDateTime,
    isoDateTimeToGridTime,
    makeGridPropertyTimeInfo,
} from "@modules/_shared/DataProviderFramework/dataProviders/dependencyFunctions/gridPropertyTimeFunctions";

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
