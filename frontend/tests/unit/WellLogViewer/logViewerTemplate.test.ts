import { WellLogCurveTypeEnum_api } from "@api";
import { TemplatePlotConfig, TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { CURVE_COLOR_PALETTE, DIFF_CURVE_COLORS } from "@modules/WellLogViewer/utils/logViewerColors";
import { createLogTemplate, isValidPlot, makeTrackPlot } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { MAIN_AXIS_CURVE } from "@modules/WellLogViewer/utils/queryDataTransform";
import { configToJsonDataBlob, jsonFileToTrackConfigs } from "@modules/WellLogViewer/utils/settingsImport";
import { TemplatePlotType } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { describe, expect, test } from "vitest";

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

describe("makeTrackPlot tests", () => {
    test("should be invalid if no name is provided", () => {
        const plot = { type: "line" } as TemplatePlotConfig;
        const result = makeTrackPlot(plot);

        expect(result).toMatchObject({
            ...plot,
            _key: expect.any(String),
            _isValid: false,
            color: CURVE_COLOR_PALETTE.getColors()[0],
            color2: CURVE_COLOR_PALETTE.getColors()[3],
            fill: undefined,
            fill2: undefined,
            colorTable: undefined,
        });
    });

    test("should be valid for all simple types if name is provided", () => {
        SIMPLE_PLOT_TYPES.forEach((type) => {
            const plot = { name: "SomeCurve", type: type } as TemplatePlotConfig;
            const result = makeTrackPlot(plot);

            expect(result).toMatchObject({
                ...plot,
                _key: expect.any(String),
                _isValid: true,
                color: CURVE_COLOR_PALETTE.getColors()[0],
                color2: CURVE_COLOR_PALETTE.getColors()[3],
                fill: undefined,
                fill2: undefined,
                colorTable: undefined,
            });
        });
    });

    test("should be valid for differential type if name and name2 are provided", () => {
        const plot = { name: "SomeCurve", name2: "SomeCurve2", type: "differential" } as TemplatePlotConfig;
        const result = makeTrackPlot(plot);

        expect(result).toMatchObject({
            ...plot,
            _key: expect.any(String),
            _isValid: true,
            color: CURVE_COLOR_PALETTE.getColors()[0],
            color2: CURVE_COLOR_PALETTE.getColors()[3],
            fill: DIFF_CURVE_COLORS[0],
            fill2: DIFF_CURVE_COLORS[1],
        });
    });

    test("should throw an error for unsupported 'stacked' plot type", () => {
        const plot = { name: "SomeCurve", type: "stacked" } as TemplatePlotConfig;

        expect(() => makeTrackPlot(plot)).toThrow("Stacked graph type currently not supported");
    });

    test("should throw an error for unsupported plot type", () => {
        // @ts-expect-error "Purposeful erroneous type"
        const plot = { name: "SomeCurve", type: "unsupported" } as TemplatePlotConfig;

        expect(() => makeTrackPlot(plot)).toThrow("Unsupported plot type: unsupported");
    });

    test("should create a valid gradientfill plot config", () => {
        const plot = { name: "SomeCurve", type: "gradientfill" } as TemplatePlotConfig;
        const result = makeTrackPlot(plot);

        expect(result).toMatchObject({
            _key: expect.any(String),
            _isValid: true,
            colorTable: "Continuous",
        });
    });

    test("should use provided colors if provided", () => {
        const plot = { name: "SomeCurve", type: "line", color: "#123456", color2: "#654321" } as TemplatePlotConfig;
        const result = makeTrackPlot(plot);

        expect(result).toMatchObject({
            _key: expect.any(String),
            _isValid: true,
            color: "#123456",
            color2: "#654321",
        });
    });

    test("should generate a new _key if not provided", () => {
        const plot = { type: "line" } as TemplatePlotConfig;
        const result = makeTrackPlot(plot);

        expect(result._key).toBeDefined();
        expect(result._key).toHaveLength(36); // UUID length
    });

    test("should retain the provided _key if available", () => {
        const plot = { name: "SomeCurve", type: "line", _key: "existing-id" } as TemplatePlotConfig;
        const result = makeTrackPlot(plot);

        expect(result._key).toBe("existing-id");
    });

    test("should discard other curve specific values when creating a plot", () => {
        const plot = {
            name: "SomeCurve",
            type: "line",
            // These values are not relevant line-plots
            fill: "red",
            fill2: "blue",
            colorMapFunctionName: "Discrete",
        } as TemplatePlotConfig;

        const result = makeTrackPlot(plot);

        expect(result).toMatchObject({
            fill: undefined,
            fill2: undefined,
            colorTable: undefined,
        });
    });
});

describe("Other utilities", () => {
    test("Should catch invalid plot configs", () => {
        const type = "line" as TemplatePlotType;
        const config1 = { name: "SomeCurve", color: "#123456" };
        const config2 = { color: "#123456", type };
        const config3 = { name: "SomeCurve", type };

        expect(isValidPlot(config1)).toBe(false);
        expect(isValidPlot(config2)).toBe(false);
        expect(isValidPlot(config3)).toBe(false);

        ["differential", "gradientfill"].forEach((type) => {
            const invalid = {
                name: "SomeCurve",
                type: type,
                color: "#123456",
            } as TemplatePlotConfig;

            expect(isValidPlot(invalid)).toBe(false);
        });

        const config = { name: "SomeCurve", type: "unsupported", color: "#123456" };
        // @ts-expect-error Testing invalid plot type
        expect(isValidPlot(config)).toBe(false);

        const illegalPlotConfig = {
            name: "SomeCurve",
            type: "stacked",
            color: "#123456",
        } as Partial<TemplatePlotConfig>;

        expect(() => isValidPlot(illegalPlotConfig)).toThrow("Stacked graph type currently not supported");
    });

    test("Should correctly validate/invalidate a plot config", () => {
        const config = { name: "SomeCurve", color: "#123456" };
        expect(isValidPlot(config)).toBe(false);

        SIMPLE_PLOT_TYPES.forEach((type) => {
            const validPlotConfig = {
                name: "SomeCurve",
                type: type,
                color: "#123456",
            } as TemplatePlotConfig;

            expect(isValidPlot(validPlotConfig)).toBe(true);
        });

        const validGradient = {
            name: "SomeCurve",
            type: "gradientfill",
            color: "#123456",
            colorMapFunctionName: "Continuous",
        } as TemplatePlotConfig;

        const validDifferential = {
            name: "SomeCurve",
            name2: "SomeOtherCurve",
            type: "differential",
            color: "#123456",
            color2: "#654321",
            fill: "#abcdef",
            fill2: "#fedcba",
        } as TemplatePlotConfig;

        expect(isValidPlot(validGradient)).toBe(true);
        expect(isValidPlot(validDifferential)).toBe(true);
    });

    test("Should create a valid log template when given a tracks", () => {
        const result = createLogTemplate([
            {
                title: "Track test 1",
                plots: [{ name: "Curve 1", type: "line", color: "#123456" }],
            },
        ]);

        expect(result).toMatchObject({
            name: "Well log viewer",
            scale: { primary: MAIN_AXIS_CURVE.name, allowSecondary: true },
        });
        expect(result.tracks).toHaveLength(1);
    });

    test("Should create a valid log template when given no plots", () => {
        const result = createLogTemplate([]);

        expect(result).toMatchObject({
            name: expect.any(String),
            scale: { primary: MAIN_AXIS_CURVE.name, allowSecondary: true },
            tracks: [],
        });
    });
});

describe("settings import export tests", () => {
    test("should export a list of configs as a data-blob url", () => {
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

    test("should export a list of configs an empty config list as null", () => {
        const input: TemplateTrackConfig[] = [];

        // Empty list should give null
        const result = configToJsonDataBlob(input);
        expect(result).toBe(null);
    });

    test("should import an array of unkown objects as an array of TemplateTrackConfig objects", async () => {
        const input = new MockFile([
            {
                title: "Track 1",
                plots: [{ name: "Curve 1", type: "line", color: "#123456" }],
            },
            {
                title: "Track 2",
                plots: [{ name: "Curve 2", type: "dot", color: "#654321" }],
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
                    name: "Curve 1",
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
                    name: "Curve 2",
                    type: "dot",
                },
            ],
        });
    });

    test("should generate a _key if not provided", async () => {
        const input = new MockFile([
            {
                title: "Track 1",
                plots: [{ name: "Curve 1", type: "line", color: "#123456" }],
            },
        ]);

        const result = await jsonFileToTrackConfigs(input as unknown as File);

        expect(result[0]._key).toBeDefined();
        expect(result[0]._key).toHaveLength(36); // UUID length
    });

    test("should throw an error if required track fields are missing", async () => {
        const input = new MockFile([{ plots: [] }]);

        await expect(jsonFileToTrackConfigs(input as unknown as File)).rejects.toThrow("Missing required fields");
    });

    test("should throw an error if file has wrong file-type", async () => {
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

    test('should mark invalid plots with "_valid: false"', async () => {
        const input = new MockFile([
            {
                title: "Track 1",
                plots: [
                    { type: "line", color: "#654321" },
                    { name: "Curve 2", type: "differential", color: "#654321" },
                ],
            },
        ]);

        const result = await jsonFileToTrackConfigs(input as unknown as File);
        expect(result).toMatchObject([{ plots: [{ _isValid: false }, { _isValid: false }] }]);
    });

    describe("isValidPlot tests", () => {
        test("should return false if type is missing", () => {});

        test("should return false if name is missing", () => {});

        test("should return false if color is missing", () => {});

        test("should return false if type is not in PLOT_TYPES", () => {
            const config = { name: "SomeCurve", type: "unsupported" as TemplatePlotType, color: "#123456" };
            expect(isValidPlot(config)).toBe(false);
        });

        test("should throw an error for unsupported 'stacked' plot type", () => {
            const config = { name: "SomeCurve", type: "stacked" as TemplatePlotType, color: "#123456" };
            expect(() => isValidPlot(config)).toThrow("Stacked graph type currently not supported");
        });

        test("should return true for valid simple plot types", () => {
            SIMPLE_PLOT_TYPES.forEach((type) => {
                const config = { name: "SomeCurve", type: type, color: "#123456" };
                expect(isValidPlot(config)).toBe(true);
            });
        });

        test("should return false for differential type if name2, color2, fill, or fill2 are missing", () => {
            const config = { name: "SomeCurve", type: "differential" as TemplatePlotType, color: "#123456" };
            expect(isValidPlot(config)).toBe(false);
        });

        test("should return true for valid differential type", () => {
            const config = {
                name: "SomeCurve",
                name2: "SomeCurve2",
                type: "differential" as TemplatePlotType,
                color: "#123456",
                color2: "#654321",
                fill: "#abcdef",
                fill2: "#fedcba",
            };
            expect(isValidPlot(config)).toBe(true);
        });

        test("should return false for gradientfill type if colorTable is missing", () => {
            const config = { name: "SomeCurve", type: "gradientfill" as TemplatePlotType, color: "#123456" };
            expect(isValidPlot(config)).toBe(false);
        });

        test("should return true for valid gradientfill type", () => {
            const config = {
                name: "SomeCurve",
                type: "gradientfill" as TemplatePlotType,
                color: "#123456",
                colorTable: "Continuous",
            };
            expect(isValidPlot(config)).toBe(true);
        });
    });
});
