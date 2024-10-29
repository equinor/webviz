import { WellboreLogCurveData_api, WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { WellPicksLayerData } from "@modules/Intersection/utils/layers/WellpicksLayer";
import {
    MAIN_AXIS_CURVE,
    SECONDARY_AXIS_CURVE,
    createLogViewerWellpicks,
    createWellLogSets,
} from "@modules/WellLogViewer/utils/queryDataTransform";

import { describe, expect, it } from "vitest";

describe("QueryDataTransform", () => {
    describe("Well log viewer template test", () => {
        const mockReferenceSystem = {
            project: (md: number) => [md, md * 0.1],
        } as IntersectionReferenceSystem;

        const mockTrajectory = {
            mdArr: [0, 500, 1000, 1500, 2000],
            tvdMslArr: [
                mockReferenceSystem.project(0)[1],
                mockReferenceSystem.project(500)[1],
                mockReferenceSystem.project(1000)[1],
                mockReferenceSystem.project(1500)[1],
                mockReferenceSystem.project(2000)[1],
            ],
        } as WellboreTrajectory_api;

        const mockDataPoints: WellboreLogCurveData_api["dataPoints"] = [
            [1000, 50],
            [2000, 60],
        ];

        const mockDataPointsWithMissing: WellboreLogCurveData_api["dataPoints"] = [
            [1000, 50],
            [2000, -999],
        ];

        const mockCurveData: WellboreLogCurveData_api = {
            name: "GR",
            logName: "TEST",
            unit: "API",
            curveAlias: "GR",
            curveUnitDesc: null,
            indexUnit: "M",
            noDataValue: -999,
            indexMin: 1000,
            indexMax: 2000,
            minCurveValue: 50,
            maxCurveValue: 60,
            curveDescription: "Gamma Ray",
            dataPoints: mockDataPoints,
            metadataDiscrete: null,
        };

        it("should have a axis-only set first", () => {
            const wellLog = createWellLogSets([], mockTrajectory, mockReferenceSystem)[0];

            expect(wellLog.header.startIndex).toBe(0);
            expect(wellLog.header.endIndex).toBe(2000);

            expect(wellLog.curves).toEqual([MAIN_AXIS_CURVE, SECONDARY_AXIS_CURVE]);
            expect(wellLog.data).toEqual([
                [0, 0],
                [500, 50],
                [1000, 100],
                [1500, 150],
                [2000, 200],
            ]);
        });

        it("should create a well log with the correct header, curves, and data", () => {
            // First set is always a axis only set
            const wellLog = createWellLogSets([mockCurveData], mockTrajectory, mockReferenceSystem)[1];

            expect(wellLog.header.startIndex).toBe(1000);
            expect(wellLog.header.endIndex).toBe(2000);

            expect(wellLog.curves).toEqual([
                MAIN_AXIS_CURVE,
                SECONDARY_AXIS_CURVE,
                {
                    name: "GR",
                    unit: "API",
                    dimensions: 1,
                    valueType: "number",
                    description: "Gamma Ray",
                },
            ]);

            expect(wellLog.data).toEqual([
                [1000, 100, 50],
                [2000, 200, 60],
            ]);
        });

        it("should handle missing curve data", () => {
            const curveData = { ...mockCurveData, dataPoints: mockDataPointsWithMissing };

            const wellLog = createWellLogSets([curveData], mockTrajectory, mockReferenceSystem)[1];

            expect(wellLog.data).toEqual([
                [1000, 100, 50],
                [2000, 200, null],
            ]);
        });

        it("should gracefully handle invalid index values", () => {
            const curveData = {
                ...mockCurveData,
                dataPoints: [
                    [null, 50],
                    [null, 60],
                ],
            };

            const wellLog = createWellLogSets([curveData], mockTrajectory, mockReferenceSystem)[1];

            expect(wellLog.data).toEqual([]);
        });

        it("should handle multiple curves correctly", () => {
            const secondCurveData: WellboreLogCurveData_api = {
                name: "RHOB",
                logName: "TEST",
                unit: "g/cm3",
                curveAlias: null,
                curveUnitDesc: null,
                indexUnit: "M",
                noDataValue: -999,
                indexMin: 1000,
                indexMax: 2000,
                minCurveValue: 50,
                maxCurveValue: 60,
                curveDescription: null,
                metadataDiscrete: null,
                dataPoints: [
                    [1000, 2.3],
                    [2000, 2.4],
                ],
            };
            const wellLog = createWellLogSets([mockCurveData, secondCurveData], mockTrajectory, mockReferenceSystem)[1];

            expect(wellLog.curves).toEqual([
                MAIN_AXIS_CURVE,
                SECONDARY_AXIS_CURVE,
                {
                    name: "GR",
                    unit: "API",
                    dimensions: 1,
                    valueType: "number",
                    description: "Gamma Ray",
                },
                {
                    name: "RHOB",
                    unit: "g/cm3",
                    dimensions: 1,
                    valueType: "number",
                    description: null,
                },
            ]);

            expect(wellLog.data).toEqual([
                [1000, 100, 50, 2.3],
                [2000, 200, 60, 2.4],
            ]);
        });

        it("should handle multiple dimensions correctly", () => {
            const curveData = {
                ...mockCurveData,
                dataPoints: [
                    [1000, 50, 1111],
                    [2000, 60, 2222],
                ],
            };

            const wellLog = createWellLogSets([curveData], mockTrajectory, mockReferenceSystem)[1];

            expect(wellLog.curves[2].dimensions).toBe(1);
            expect(wellLog.data).toEqual([
                [1000, 100, 50],
                [2000, 200, 60],
            ]);
        });

        // Is this test necessary, or is it just an issue types not being strict enough?
        // - If an mdArr is successfully returned, can it EVER be empty?
        // - Can intersectionReferenceSystem.project() ever return an empty array?
        it("should handle missing mdArr and refferenceSystem values", () => {
            // @ts-expect-error "Only the "project" method is relevant for us
            const brokenReferenceSystem = {
                project: () => [] as number[],
            } as IntersectionReferenceSystem;

            const wellLog = createWellLogSets([mockCurveData], mockTrajectory, brokenReferenceSystem)[1];

            expect(wellLog.header.startIndex).toBe(1000);
            expect(wellLog.header.endIndex).toBe(2000);

            expect(wellLog.data).toEqual([
                [1000, null, 50],
                [2000, null, 60],
            ]);
        });

        it("should be able to inject empty data-rows for entire wellbore length", () => {
            const mockTrajectoryWithExtraRows = {
                mdArr: [0, 1000, 2000, 3000, 4000],
            } as WellboreTrajectory_api;

            const wellLog = createWellLogSets(
                [mockCurveData],
                mockTrajectoryWithExtraRows,
                mockReferenceSystem,
                new Set(),
                true
            )[1];

            expect(wellLog.data).toEqual([
                [0, 0, null],
                [1000, 100, 50],
                [2000, 200, 60],
                [3000, 300, null],
                [4000, 400, null],
            ]);
        });

        it("should throw if index entry is a string", () => {
            const mockWithStringIndices: WellboreLogCurveData_api = {
                ...mockCurveData,
                dataPoints: [
                    ["a", 1],
                    ["b", 2],
                ],
            };

            expect(() => {
                createWellLogSets([mockWithStringIndices], mockTrajectory, mockReferenceSystem);
            }).toThrow("Scale index value cannot be a string");
        });

        it("should handle string data values", () => {
            const mockWithStringIndices: WellboreLogCurveData_api = {
                ...mockCurveData,
                dataPoints: [
                    [1000, "a"],
                    [2000, "b"],
                ],
            };
            const wellLog = createWellLogSets([mockWithStringIndices], mockTrajectory, mockReferenceSystem)[1];

            expect(wellLog.data).toEqual([
                [1000, 100, "a"],
                [2000, 200, "b"],
            ]);
        });

        it("should generate discrete curves with discrete metadata", () => {
            const mockDiscrete: WellboreLogCurveData_api = {
                ...mockCurveData,
                name: "DISCRETE",
                dataPoints: [
                    [500, 0],
                    [1000, 2],
                    [1500, 1],
                    [2000, null],
                ],
                metadataDiscrete: {
                    Yes: [0, [255, 0, 0]],
                    No: [1, [0, 255, 0]],
                    Maybe: [2, [0, 0, 255]],
                },
            };

            const wellLog = createWellLogSets([mockDiscrete], mockTrajectory, mockReferenceSystem)[1];

            expect(wellLog.metadata_discrete).toEqual({
                DISCRETE: {
                    attributes: ["code", "color"],
                    objects: {
                        Yes: [0, [255, 0, 0]],
                        No: [1, [0, 255, 0]],
                        Maybe: [2, [0, 0, 255]],
                    },
                },
            });

            // ! Note that the offset is these entries *are expected* due to a workaround, see `createWellLogSets` implementation for details
            expect(wellLog.data).toEqual([
                [500, 50, null],
                [1000, 100, 0],
                [1500, 150, 2],
                [2000, 200, 1],
            ]);
        });

        it("should seperate curves based on well log name", () => {
            const otherCurve1: WellboreLogCurveData_api = {
                ...mockCurveData,
                name: "OTHER_CURVE",
                logName: "OTHER_TEST",
            };
            const otherCurve2: WellboreLogCurveData_api = {
                ...mockCurveData,
                name: "YET_ANOTHER_CURVE",
                logName: "OTHER_TEST",
            };

            const sets = createWellLogSets(
                [mockCurveData, otherCurve1, otherCurve2],
                mockTrajectory,
                mockReferenceSystem
            );

            // Should be 3: 1 for the axis set, and one for each curve
            expect(sets).toHaveLength(3); // Axis set + two sets for the different logs

            // Cannot assume order for the sets, so need to manually find them
            const logNormal = sets.find(({ header }) => header.name === mockCurveData.logName);
            const logOther = sets.find(({ header }) => header.name === otherCurve1.logName);

            expect(logNormal).toBeDefined();
            expect(logNormal?.curves).toHaveLength(3); // Axis curves + the standard mock curve
            expect(logOther).toBeDefined();
            expect(logOther?.curves).toHaveLength(4); // Axis curves + othercurve 1 and 2
        });

        it("should ensure unique curve names for non-unique curves", () => {
            const otherCurve: WellboreLogCurveData_api = {
                ...mockCurveData,
                logName: "OTHER_TEST",
            };

            const nonUniqueCurveNames = new Set([mockCurveData.name]);

            const sets = createWellLogSets(
                [mockCurveData, otherCurve],
                mockTrajectory,
                mockReferenceSystem,
                nonUniqueCurveNames
            );

            const curve1 = sets[1].curves[2];
            const curve2 = sets[2].curves[2];

            expect(curve1.name).not.toBe(curve2.name);
        });
    });

    describe("Well-picks", () => {
        const mockNonUnitPick = {
            identifier: "Some pick",
            md: 1000,
        } as WellPicksLayerData["nonUnitPicks"][0];

        const mockUnitPick = {
            entryPick: {
                identifier: "A units entry-pick",
                md: 1500,
            },
            exitPick: {
                identifier: "A units exit-pick",
                md: 2000,
            },
        } as WellPicksLayerData["unitPicks"][0];

        const mockTransformedWellpickData: WellPicksLayerData = {
            nonUnitPicks: [mockNonUnitPick],
            unitPicks: [mockUnitPick],
        };

        it("should generate wellpick props from wellpick data", () => {
            const wellpickProps = createLogViewerWellpicks(mockTransformedWellpickData);

            expect(wellpickProps.wellpick.curves).toEqual([
                MAIN_AXIS_CURVE,
                {
                    name: "PICK",
                    valueType: "string",
                    dimensions: 1,
                },
            ]);

            expect(wellpickProps.wellpick.data).toEqual([
                [1000, "Some pick"],
                [1500, "A units entry-pick"],
                [2000, "A units exit-pick"],
            ]);
        });

        it("should merge stacked well-picks", () => {
            const stackedNonUnitPick = { ...mockNonUnitPick, md: 1500 };
            const pickDataWithStacked = { ...mockTransformedWellpickData, nonUnitPicks: [stackedNonUnitPick] };

            const wellpickProps = createLogViewerWellpicks(pickDataWithStacked);

            expect(wellpickProps.wellpick.data).toEqual([
                [1500, "Some pick + A units entry-pick"],
                [2000, "A units exit-pick"],
            ]);
        });
    });
});
