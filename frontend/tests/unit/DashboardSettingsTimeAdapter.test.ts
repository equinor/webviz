import { describe, expect, it } from "vitest";

import { isoStringToTimestampUtcMs } from "@framework/utils/timestampUtils";
import { makeTimePointDpfDashboardSettingAdapter } from "@modules/_shared/DataProviderFramework/settings/SettingRegistry/dashboardSettingAdapters";

describe("makeTimePointDpfDashboardSettingAdapter", () => {
    const adapter = makeTimePointDpfDashboardSettingAdapter();

    it("contributes only the time points, as UTC timestamps", () => {
        const constraints = ["2018-01-01T00:00:00", "2018-01-01T00:00:00/2019-01-01T00:00:00", "NO_TIME"];

        expect(adapter.mapValueConstraintsToDashboardConstraints(constraints)).toEqual([Date.UTC(2018, 0, 1)]);
    });

    it("has no opinion when there are no time points", () => {
        expect(adapter.mapValueConstraintsToDashboardConstraints(["NO_TIME"])).toBeNull();
        expect(adapter.mapValueConstraintsToDashboardConstraints([])).toBeNull();
    });

    it("maps the dashboard time onto the option with the same timestamp, regardless of its format", () => {
        const constraints = ["2018-01-01T00:00:00", "2019-01-01T00:00:00"];
        const dashboardTime = isoStringToTimestampUtcMs("2019-01-01");

        expect(adapter.mapDashboardValueToInternalValue(dashboardTime, constraints, null)).toBe("2019-01-01T00:00:00");
    });

    it("maps a time this setting doesn't have to null", () => {
        expect(adapter.mapDashboardValueToInternalValue(Date.UTC(2020, 0, 1), ["2018-01-01T00:00:00"], null)).toBeNull();
    });

    it("keeps the local value when the setting has no time points", () => {
        expect(adapter.mapDashboardValueToInternalValue(Date.UTC(2018, 0, 1), ["NO_TIME"], "NO_TIME")).toBe("NO_TIME");
    });
});
