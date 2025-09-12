import { describe, expect, it } from "vitest";

import { WellLogCurveSourceEnum_api } from "@api";
import type { TemplatePlot } from "@modules/_shared/types/wellLogTemplates";
import { curveSourceToText, getUniqueCurveNameForPlotConfig, simplifyLogName } from "@modules/_shared/utils/wellLog";

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
        const plot: TemplatePlot = {
            name: "unique",
            logName: "log",
        };
        expect(getUniqueCurveNameForPlotConfig(plot)).toEqual("unique");
    });
    it("should return a compound name if the plot name is not unique", () => {
        const plot: TemplatePlot = {
            name: "not_unique",
            logName: "log",
        };
        const nonUniqueNames = new Set(["not_unique"]);
        expect(getUniqueCurveNameForPlotConfig(plot, nonUniqueNames)).toEqual("not_unique - log");
    });
    it("should throw for invalid config", () => {
        const plot1: TemplatePlot = {
            name: "",
            logName: "log",
        };

        const plot2: TemplatePlot = {
            name: "name",
            logName: "",
        };
        expect(() => getUniqueCurveNameForPlotConfig(plot1)).toThrow("Unexpected invalid config");
        expect(() => getUniqueCurveNameForPlotConfig(plot2)).toThrow("Unexpected invalid config");
    });
});
