import { WellLogCurveSourceEnum_api } from "@api";
import type { TemplatePlotConfig } from "@modules/WellLogViewer/types";
import {
    curveSourceToText,
    getUniqueCurveNameForPlotConfig,
    simplifyLogName,
} from "@modules/WellLogViewer/utils/strings";

import { describe, expect, it } from "vitest";

describe("curveSourceToText", () => {
    it("should return 'Geology' for SMDA_GEOLOGY", () => {
        expect(curveSourceToText(WellLogCurveSourceEnum_api.SMDA_GEOLOGY)).toBe("Geology");
    });

    it("should return 'Stratigraphy' for SMDA_STRATIGRAPHY", () => {
        expect(curveSourceToText(WellLogCurveSourceEnum_api.SMDA_STRATIGRAPHY)).toBe("Stratigraphy");
    });

    it("should return 'Well-log' for SSDL_WELL_LOG", () => {
        expect(curveSourceToText(WellLogCurveSourceEnum_api.SSDL_WELL_LOG)).toBe("Well-log");
    });
});

describe("simplifyLogName", () => {
    it("should truncate names to a given length", () => {
        const name = simplifyLogName("SomeVeryLongLogName", 5);

        expect(name).toEqual("Some…");
    });

    it("should truncate known names in a specific manner", () => {
        const name = simplifyLogName("OpenWorks R5000");
        expect(name).toEqual("OpenWorks");
    });
});

describe("getUniqueCurveNameForPlotConfig", () => {
    it("should return the plot name if it's unique", () => {
        const plot: TemplatePlotConfig = {
            name: "unique",
            // @ts-expect-error Only these fields are relevant
            _curveHeader: { curveName: "curve", logName: "log" },
        };

        expect(getUniqueCurveNameForPlotConfig(plot)).toEqual("unique");
    });

    it("should return a compound name if the plot name is not unique", () => {
        const plot: TemplatePlotConfig = {
            name: "not_unique",
            // @ts-expect-error Only these fields are relevant
            _curveHeader: { curveName: "curve", logName: "log" },
        };

        const nonUniqueNames = new Set(["not_unique"]);

        expect(getUniqueCurveNameForPlotConfig(plot, nonUniqueNames)).toEqual("curve - log");
    });

    it("should throw for invalid config", () => {
        const plot1: TemplatePlotConfig = {
            name: "",
            // @ts-expect-error Only these fields are relevant
            _curveHeader: { curveName: "curve", logName: "log" },
        };

        // @ts-expect-error Only these fields are relevant
        const plot2: TemplatePlotConfig = {
            name: "name",
            _curveHeader: null,
        };

        expect(() => getUniqueCurveNameForPlotConfig(plot1)).toThrow("Unexpected invalid config");

        expect(() => getUniqueCurveNameForPlotConfig(plot2)).toThrow("Unexpected invalid config");
    });
});
