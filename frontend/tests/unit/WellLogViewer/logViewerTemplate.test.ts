import { WellLogCurveSourceEnum_api, WellLogCurveTypeEnum_api, WellboreLogCurveHeader_api } from "@api";
import { TemplatePlotConfig, TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { createLogTemplate, makeTrackPlot } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { MAIN_AXIS_CURVE } from "@modules/WellLogViewer/utils/queryDataTransform";
import { configToJsonDataBlob, jsonFileToTrackConfigs } from "@modules/WellLogViewer/utils/settingsImport";
import { TemplatePlotType } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { describe, expect, it, vi } from "vitest";

// These plot types are "simple", and only require name and color
const SIMPLE_PLOT_TYPES = ["line", "linestep", "dot", "area"] as TemplatePlotType[];

class MockFile {
    private fauxData: any;
    public type: string;

    constructor(obj: any, fileType = "application/json") {
        this.fauxData = JSON.stringify(obj);
        this.type = fileType;
    }

    async text() {
        return this.fauxData;
    }
}
const MOCK_CURVE_HEADER1: WellboreLogCurveHeader_api = {
    curveType: WellLogCurveTypeEnum_api.CONTINUOUS,
    source: WellLogCurveSourceEnum_api.SSDL_WELL_LOG,
    curveName: "Continuous1",
    curveUnit: "m",
    logName: "FooLog",
};

const MOCK_CURVE_HEADER2: WellboreLogCurveHeader_api = {
    curveType: WellLogCurveTypeEnum_api.CONTINUOUS,
    source: WellLogCurveSourceEnum_api.SSDL_WELL_LOG,
    curveName: "Continuous2",
    curveUnit: "m",
    logName: "FooLog",
};

const MOCK_CURVE_HEADER3: WellboreLogCurveHeader_api = {
    curveType: WellLogCurveTypeEnum_api.FLAG,
    source: WellLogCurveSourceEnum_api.SSDL_WELL_LOG,
    curveName: "Flag1",
    curveUnit: "m",
    logName: "FooFlagLog",
};

const MOCK_CURVE_HEADER4: WellboreLogCurveHeader_api = {
    curveType: WellLogCurveTypeEnum_api.DISCRETE,
    source: WellLogCurveSourceEnum_api.SMDA_STRATIGRAPHY,
    curveName: "Lithology",
    logName: "Lithology",
    curveUnit: null,
};

describe("makeTrackPlot tests", () => {
    it("should create a config with default values", () => {
        const result = makeTrackPlot({ _curveHeader: null, type: "line" });

        expect(result).toMatchObject({
            _key: expect.any(String),
            _isValid: false,
            name: undefined,
            name2: undefined,
            color: expect.any(String),
            color2: expect.any(String),
            fill: undefined,
            fill2: undefined,
            colorMapFunctionName: undefined,
        });
    });

    it("should be invalid if no header is provided", () => {
        const plot = { type: "line", name: "Some curve" } as TemplatePlotConfig;
        const result = makeTrackPlot(plot);

        expect(result._isValid).toBe(false);
    });

    it("should be valid for all simple types only if a header is provided", () => {
        SIMPLE_PLOT_TYPES.forEach((type) => {
            const result1 = makeTrackPlot({ type: type, _curveHeader: MOCK_CURVE_HEADER1 });

            const result2 = makeTrackPlot({ type: type, _curveHeader: null });

            expect(result1._isValid).toBe(true);
            expect(result2._isValid).toBe(false);
        });
    });

    it("should be valid for differential type if both header 1 and 2 is provided", () => {
        const result1 = makeTrackPlot({
            type: "differential",
            _curveHeader: MOCK_CURVE_HEADER1,
            _curveHeader2: MOCK_CURVE_HEADER2,
        });
        const result2 = makeTrackPlot({
            type: "differential",
            _curveHeader: MOCK_CURVE_HEADER1,
            _curveHeader2: null,
        });

        const result3 = makeTrackPlot({
            type: "differential",
            _curveHeader: null,
            _curveHeader2: MOCK_CURVE_HEADER2,
        });

        expect(result1._isValid).toBe(true);
        expect(result2._isValid).toBe(false);
        expect(result3._isValid).toBe(false);
    });

    it("should create a valid gradientfill plot config", () => {
        const result = makeTrackPlot({
            _curveHeader: MOCK_CURVE_HEADER1,
            type: "gradientfill",
        });

        expect(result.colorMapFunctionName).toBe("Continuous");
    });

    it("should use provided colors if provided", () => {
        const result = makeTrackPlot({ _curveHeader: null, type: "differential", color: "#123456", color2: "#654321" });

        expect(result).toMatchObject({
            color: "#123456",
            color2: "#654321",
        });
    });

    it("should generate a new _key if not provided", () => {
        const plot = { type: "line" } as TemplatePlotConfig;
        const result = makeTrackPlot(plot);

        expect(result._key).toBeDefined();
        expect(result._key).toHaveLength(36); // UUID length
    });

    it("should retain the provided _key if available", () => {
        const plot = { name: "SomeCurve", type: "line", _key: "existing-id" } as TemplatePlotConfig;
        const result = makeTrackPlot(plot);

        expect(result._key).toBe("existing-id");
    });

    it("should discard other curve specific values when creating a plot", () => {
        const result = makeTrackPlot({
            _curveHeader: MOCK_CURVE_HEADER1,
            type: "line",
            // These values are not relevant line-plots
            fill: "red",
            fill2: "blue",
            colorMapFunctionName: "Discrete",
        });

        expect(result).toMatchObject({
            colorMapFunctionName: undefined,
            fill: undefined,
            fill2: undefined,
        });
    });
});

describe("Other utilities", () => {
    it("Should catch invalid plot configs", () => {
        const type = "line" as TemplatePlotType;

        const config1 = makeTrackPlot({ color: "#123456", type });

        // Curveheader 2 is missing
        const config2 = makeTrackPlot({ _curveHeader: MOCK_CURVE_HEADER1, type: "differential" });

        expect(config1._isValid).toBe(false);
        expect(config2._isValid).toBe(false);

        ["differential", "gradientfill"].forEach((type) => {
            const invalid = makeTrackPlot({
                name: "SomeCurve",
                type: type as TemplatePlotType,
                color: "#123456",
            });

            expect(invalid._isValid).toBe(false);
        });
    });

    it("Should create a valid log template when given a tracks", () => {
        const result = createLogTemplate([
            {
                _type: WellLogCurveTypeEnum_api.CONTINUOUS,
                _key: "my-uuid",
                title: "Track test 1",
                plots: [
                    makeTrackPlot({
                        _curveHeader: MOCK_CURVE_HEADER2,
                        name: "Curve 1",
                        type: "line",
                        color: "#123456",
                    }),
                ],
            },
        ]);

        expect(result).toMatchObject({
            name: "Well log viewer",
            scale: { primary: MAIN_AXIS_CURVE.name, allowSecondary: true },
        });
        expect(result.tracks).toHaveLength(1);
    });

    it("Should create a valid log template when given no plots", () => {
        const result = createLogTemplate([]);

        expect(result).toMatchObject({
            name: expect.any(String),
            scale: { primary: MAIN_AXIS_CURVE.name, allowSecondary: true },
            tracks: [],
        });
    });

    it("should log warning if using a stacked plot for a continuous curve", () => {
        const warnSpy = vi.spyOn(console, "warn");

        makeTrackPlot({
            type: "stacked",
            // Continuous curve, should issue a warning
            _curveHeader: MOCK_CURVE_HEADER1,
        });

        makeTrackPlot({
            type: "stacked",
            // Discrete curve, should *not* issue a warning

            _curveHeader: MOCK_CURVE_HEADER4,
        });

        expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it("should ensure unique curve names", () => {
        const nonUniqueNames = new Set([MOCK_CURVE_HEADER1.curveName]);
        const result = createLogTemplate(
            [
                {
                    _type: WellLogCurveTypeEnum_api.CONTINUOUS,
                    _key: "my-uuid",
                    title: "Track test 1",
                    plots: [
                        makeTrackPlot({
                            _curveHeader: MOCK_CURVE_HEADER1,
                            type: "line",
                            color: "#123456",
                        }),
                        makeTrackPlot({
                            _curveHeader: {
                                ...MOCK_CURVE_HEADER1,
                                logName: "OtherFooLog",
                            },
                            type: "line",
                            color: "#123456",
                        }),
                    ],
                },
            ],
            nonUniqueNames
        );

        const plot1 = result.tracks[0].plots[0];
        const plot2 = result.tracks[0].plots[1];

        expect(plot1.name).not.toEqual(plot2.name);
    });
});

describe("settings import export tests", () => {
    it("should export a list of configs as a data-blob url", () => {
        const input: TemplateTrackConfig[] = [
            {
                _key: "test",
                _type: WellLogCurveTypeEnum_api.CONTINUOUS,
                title: "test-track",
                plots: [],
            },
        ];

        // Empty list should give null
        const result = configToJsonDataBlob(input);
        expect(result).toMatch(/^data:text\/json/);
    });

    it("should export a list of configs an empty config list as null", () => {
        const input: TemplateTrackConfig[] = [];

        // Empty list should give null
        const result = configToJsonDataBlob(input);
        expect(result).toBe(null);
    });

    it("should import an array of unkown objects as an array of TemplateTrackConfig objects", async () => {
        const input = new MockFile([
            {
                title: "Track 1",
                _type: WellLogCurveTypeEnum_api.CONTINUOUS,
                plots: [{ _curveHeader: MOCK_CURVE_HEADER1, type: "line", color: "#123456" }],
            },
            {
                title: "Track 2",
                _type: WellLogCurveTypeEnum_api.FLAG,
                plots: [{ _curveHeader: MOCK_CURVE_HEADER3, type: "dot", color: "#654321" }],
            },
        ]);

        const result = await jsonFileToTrackConfigs(input as unknown as File);

        // const result = jsonFileToTrackConfigs(input);
        expect(result).toHaveLength(2);

        expect(result[0]).toMatchObject({
            title: "Track 1",
            plots: [
                {
                    _key: expect.any(String),
                    _isValid: true,
                    name: "Continuous1",
                    type: "line",
                },
            ],
        });

        expect(result[1]).toMatchObject({
            title: "Track 2",
            plots: [
                {
                    _key: expect.any(String),
                    _isValid: true,
                    name: "Flag1",
                    type: "dot",
                },
            ],
        });
    });

    it("should generate a _key if not provided", async () => {
        const input = new MockFile([
            {
                title: "Track 1",
                _type: WellLogCurveTypeEnum_api.CONTINUOUS,
                plots: [],
            },
        ]);

        const result = await jsonFileToTrackConfigs(input as unknown as File);

        expect(result[0]._key).toBeDefined();
        expect(result[0]._key).toHaveLength(36); // UUID length
    });

    it("should throw an error if required track fields are missing", async () => {
        const input = new MockFile([{ plots: [] }]);

        await expect(jsonFileToTrackConfigs(input as unknown as File)).rejects.toThrow("Missing required fields");
    });

    it("should throw an error if file has wrong file-type", async () => {
        const input = new MockFile(
            [
                {
                    title: "Track 1",
                    plots: [{ name: "Curve 1", type: "line", color: "#123456" }],
                },
            ],
            "text/plain"
        );

        await expect(jsonFileToTrackConfigs(input as unknown as File)).rejects.toThrow("Invalid file extension");
    });

    it('should mark invalid plots with "_valid: false"', async () => {
        const input = new MockFile([
            {
                title: "Track 1",
                _type: WellLogCurveTypeEnum_api.CONTINUOUS,
                plots: [
                    { type: "line", color: "#654321" },
                    { name: "Curve 2", type: "differential", color: "#654321" },
                ],
            },
        ]);

        const result = await jsonFileToTrackConfigs(input as unknown as File);
        expect(result).toMatchObject([{ plots: [{ _isValid: false }, { _isValid: false }] }]);
    });
});
