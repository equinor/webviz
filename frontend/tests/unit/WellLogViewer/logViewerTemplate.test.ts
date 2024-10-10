import { TemplatePlotConfig } from "@modules/WellLogViewer/settings/atoms/persistedAtoms";
import { CURVE_COLOR_PALETTE, DIFF_CURVE_COLORS } from "@modules/WellLogViewer/utils/logViewerColors";
import {
    PLOT_TYPE_OPTIONS,
    createLogTemplate,
    isCompositePlotType,
    isValidPlot,
    makeTrackPlot,
} from "@modules/WellLogViewer/utils/logViewerTemplate";
import { transformToTrackConfigs } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { MAIN_AXIS_CURVE } from "@modules/WellLogViewer/utils/queryDataTransform";
import { TemplatePlotTypes } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { describe, expect, test } from "vitest";

// These plot types are "simple", and only require name and color
const SIMPLE_PLOT_TYPES = ["line", "linestep", "dot", "area"] as TemplatePlotTypes[];

describe("makeTrackPlot tests", () => {
    test("should be invalid if no name is provided", () => {
        const plot = { type: "line" as TemplatePlotTypes };
        const result = makeTrackPlot(plot);

        expect(result).toMatchObject({
            ...plot,
            _id: expect.any(String),
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
            const plot = { name: "SomeCurve", type: type };
            const result = makeTrackPlot(plot);

            expect(result).toMatchObject({
                ...plot,
                _id: expect.any(String),
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
        const plot = { name: "SomeCurve", name2: "SomeCurve2", type: "differential" as TemplatePlotTypes };
        const result = makeTrackPlot(plot);

        expect(result).toMatchObject({
            ...plot,
            _id: expect.any(String),
            _isValid: true,
            color: CURVE_COLOR_PALETTE.getColors()[0],
            color2: CURVE_COLOR_PALETTE.getColors()[3],
            fill: DIFF_CURVE_COLORS[0],
            fill2: DIFF_CURVE_COLORS[1],
        });
    });

    test("should throw an error for unsupported 'stacked' plot type", () => {
        const plot = { name: "SomeCurve", type: "stacked" as TemplatePlotTypes };

        expect(() => makeTrackPlot(plot)).toThrow("Stacked graph type currently not supported");
    });

    test("should throw an error for unsupported plot type", () => {
        const plot = { name: "SomeCurve", type: "unsupported" as TemplatePlotTypes };

        expect(() => makeTrackPlot(plot)).toThrow("Unsupported plot type: unsupported");
    });

    test("should create a valid gradientfill plot config", () => {
        const plot = { name: "SomeCurve", type: "gradientfill" as TemplatePlotTypes };
        const result = makeTrackPlot(plot);

        expect(result).toMatchObject({
            _id: expect.any(String),
            _isValid: true,
            colorTable: "Continuous",
        });
    });

    test("should use provided colors if provided", () => {
        const plot = { name: "SomeCurve", type: "line" as TemplatePlotTypes, color: "#123456", color2: "#654321" };
        const result = makeTrackPlot(plot);

        expect(result).toMatchObject({
            _id: expect.any(String),
            _isValid: true,
            color: "#123456",
            color2: "#654321",
        });
    });

    test("should generate a new _id if not provided", () => {
        const plot = { type: "line" as TemplatePlotTypes };
        const result = makeTrackPlot(plot);

        expect(result._id).toBeDefined();
        expect(result._id).toHaveLength(36); // UUID length
    });

    test("should retain the provided _id if available", () => {
        const plot = { name: "SomeCurve", type: "line" as TemplatePlotTypes, _id: "existing-id" };
        const result = makeTrackPlot(plot);

        expect(result._id).toBe("existing-id");
    });

    test("should discard other curve specific values when creating a plot", () => {
        const plot = {
            name: "SomeCurve",
            type: "line" as TemplatePlotTypes,
            // These values are not relevant line-plots
            fill: "red",
            fill2: "blue",
            colorTable: "Discrete",
        };

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
        const type = "line" as TemplatePlotTypes;
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
            colorTable: "Continuous",
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

    test('Should  only differental curve counts as "composite"', () => {
        PLOT_TYPE_OPTIONS.forEach(({ value }) => {
            if (value === "differential") {
                expect(isCompositePlotType(value)).toBe(true);
            } else {
                expect(isCompositePlotType(value)).toBe(false);
            }
        });
    });
});

describe("transformToTrackConfigs tests", () => {
    test("should transform an array of objects to an array of TemplateTrackConfig objects", () => {
        const input = [
            {
                title: "Track 1",
                plots: [{ name: "Curve 1", type: "line", color: "#123456" }],
            },
            {
                title: "Track 2",
                plots: [{ name: "Curve 2", type: "dot", color: "#654321" }],
            },
        ];

        const result = transformToTrackConfigs(input);

        expect(result).toHaveLength(2);
        result.forEach((trackConfig, index) => {
            expect(trackConfig).toMatchObject({
                title: input[index].title,
                plots: input[index].plots.map((plot) => ({
                    ...plot,
                    _id: expect.any(String),
                    _isValid: true,
                })),
            });
        });
    });

    test("should generate a new _id if not provided", () => {
        const input = [
            {
                title: "Track 1",
                plots: [{ name: "Curve 1", type: "line", color: "#123456" }],
            },
        ];

        const result = transformToTrackConfigs(input);

        expect(result[0]._id).toBeDefined();
        expect(result[0]._id).toHaveLength(36); // UUID length
    });

    test("should retain the provided _id if available", () => {
        const input = [
            {
                title: "Track 1",
                _id: "existing-id",
                plots: [{ name: "Curve 1", type: "line", color: "#123456" }],
            },
        ];

        const result = transformToTrackConfigs(input);

        expect(result[0]._id).toBe("existing-id");
    });

    test("should throw an error if required track fields are missing", () => {
        const input = [{ plots: [] }];

        expect(() => transformToTrackConfigs(input)).toThrow("Missing required fields");
    });

    test('should mark invalid plots with "_valid: false"', () => {
        const input = [
            {
                title: "Track 1",
                plots: [
                    { type: "line", color: "#654321" },
                    { name: "Curve 2", type: "differential", color: "#654321" },
                ],
            },
        ];

        const result = transformToTrackConfigs(input);

        expect(result).toMatchObject([
            {
                plots: input[0].plots.map(() => ({
                    _isValid: false,
                })),
            },
        ]);
    });

    describe("isValidPlot tests", () => {
        test("should return false if type is missing", () => {});

        test("should return false if name is missing", () => {});

        test("should return false if color is missing", () => {});

        test("should return false if type is not in PLOT_TYPES", () => {
            const config = { name: "SomeCurve", type: "unsupported" as TemplatePlotTypes, color: "#123456" };
            expect(isValidPlot(config)).toBe(false);
        });

        test("should throw an error for unsupported 'stacked' plot type", () => {
            const config = { name: "SomeCurve", type: "stacked" as TemplatePlotTypes, color: "#123456" };
            expect(() => isValidPlot(config)).toThrow("Stacked graph type currently not supported");
        });

        test("should return true for valid simple plot types", () => {
            SIMPLE_PLOT_TYPES.forEach((type) => {
                const config = { name: "SomeCurve", type: type, color: "#123456" };
                expect(isValidPlot(config)).toBe(true);
            });
        });

        test("should return false for differential type if name2, color2, fill, or fill2 are missing", () => {
            const config = { name: "SomeCurve", type: "differential" as TemplatePlotTypes, color: "#123456" };
            expect(isValidPlot(config)).toBe(false);
        });

        test("should return true for valid differential type", () => {
            const config = {
                name: "SomeCurve",
                name2: "SomeCurve2",
                type: "differential" as TemplatePlotTypes,
                color: "#123456",
                color2: "#654321",
                fill: "#abcdef",
                fill2: "#fedcba",
            };
            expect(isValidPlot(config)).toBe(true);
        });

        test("should return false for gradientfill type if colorTable is missing", () => {
            const config = { name: "SomeCurve", type: "gradientfill" as TemplatePlotTypes, color: "#123456" };
            expect(isValidPlot(config)).toBe(false);
        });

        test("should return true for valid gradientfill type", () => {
            const config = {
                name: "SomeCurve",
                type: "gradientfill" as TemplatePlotTypes,
                color: "#123456",
                colorTable: "Continuous",
            };
            expect(isValidPlot(config)).toBe(true);
        });
    });
});
