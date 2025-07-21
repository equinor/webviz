import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { describe, expect, it } from "vitest";

import type { WellboreLogCurveData_api, WellborePick_api, WellboreTrajectory_api } from "@api";
import { WellLogCurveSourceEnum_api } from "@api";
import { MAIN_AXIS_CURVE, SECONDARY_AXIS_CURVE } from "@modules/WellLogViewer/constants";
import type { WellPickDataCollection } from "@modules/WellLogViewer/DataProviderFramework/visualizations/wellpicks";
import { createLogViewerWellPicks, createWellLogSets } from "@modules/WellLogViewer/utils/queryDataTransform";

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
            source: WellLogCurveSourceEnum_api.SSDL_WELL_LOG,
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
            discreteValueMetadata: null,
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
                    valueType: "float",
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
            // @ts-expect-error Purposefully invalid data
            const curveDataWithNullIndex = {
                ...mockCurveData,
                dataPoints: [
                    [null, 50],
                    [null, 60],
                ],
            } as WellboreLogCurveData_api;

            // @ts-expect-error Purposefully invalid data
            const mockWithStringIndices: WellboreLogCurveData_api = {
                ...mockCurveData,
                dataPoints: [
                    ["a", 1],
                    ["b", 2],
                ],
            } as WellboreLogCurveData_api;

            const wellLog = createWellLogSets([curveDataWithNullIndex], mockTrajectory, mockReferenceSystem)[1];

            expect(() => {
                createWellLogSets([mockWithStringIndices], mockTrajectory, mockReferenceSystem);
            }).toThrow("Scale index value cannot be a string");

            expect(wellLog.data).toEqual([]);
        });

        it("should handle multiple curves correctly", () => {
            const secondCurveData: WellboreLogCurveData_api = {
                source: WellLogCurveSourceEnum_api.SSDL_WELL_LOG,
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
                discreteValueMetadata: null,
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
                    valueType: "float",
                    description: "Gamma Ray",
                },
                {
                    name: "RHOB",
                    unit: "g/cm3",
                    dimensions: 1,
                    valueType: "float",
                    description: null,
                },
            ]);

            expect(wellLog.data).toEqual([
                [1000, 100, 50, 2.3],
                [2000, 200, 60, 2.4],
            ]);
        });

        it("should handle multiple dimensions correctly", () => {
            // @ts-expect-error Purposefully invalid data
            const curveData = {
                ...mockCurveData,
                dataPoints: [
                    [1000, 50, 1111],
                    [2000, 60, 2222],
                ],
            } as WellboreLogCurveData_api;

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
                true,
            )[1];

            expect(wellLog.data).toEqual([
                [0, 0, null],
                [1000, 100, 50],
                [2000, 200, 60],
                [3000, 300, null],
                [4000, 400, null],
            ]);
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
                discreteValueMetadata: [
                    { code: 0, identifier: "Yes", rgbColor: [255, 0, 0] },
                    { code: 1, identifier: "No", rgbColor: [0, 255, 0] },
                    { code: 2, identifier: "Maybe", rgbColor: [0, 0, 255] },
                ],
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
                mockReferenceSystem,
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
                nonUniqueCurveNames,
            );

            const curve1 = sets[1].curves[2];
            const curve2 = sets[2].curves[2];

            expect(curve1.name).not.toBe(curve2.name);
        });

        it("should append name to logName if source is not SSDL_WELL_LOG", () => {
            const curveData = [
                {
                    source: WellLogCurveSourceEnum_api.SMDA_GEOLOGY,
                    logName: "log1",
                    name: "curve1",
                    dataPoints: [[0, 1]],
                },
            ] as WellboreLogCurveData_api[];

            const result = createWellLogSets(curveData, mockTrajectory, mockReferenceSystem);

            expect(result[1].header.name).toBe("log1::curve1");
        });

        it("should not append name to logName if source is SSDL_WELL_LOG", () => {
            const curveData = [
                {
                    source: WellLogCurveSourceEnum_api.SSDL_WELL_LOG,
                    logName: "log1",
                    name: "curve1",
                    dataPoints: [[0, 1]],
                },
            ] as WellboreLogCurveData_api[];

            const result = createWellLogSets(curveData, mockTrajectory, mockReferenceSystem);

            expect(result[1].header.name).toBe("log1");
        });
    });

    describe("Well-picks", () => {
        const mockWellPickCollection1: WellPickDataCollection = {
            stratColumn: "Test column",
            interpreter: "Test interpreter",
            picks: [
                {
                    pickIdentifier: "Some pick",
                    md: 1000,
                } as WellborePick_api,
                {
                    pickIdentifier: "A units entry-pick",
                    md: 1500,
                } as WellborePick_api,
                {
                    pickIdentifier: "A units exit-pick",
                    md: 2000,
                } as WellborePick_api,
            ],
        };

        const mockWellPickCollection2: WellPickDataCollection = {
            stratColumn: "Test column 2",
            interpreter: "Test interpreter",
            picks: [
                {
                    pickIdentifier: "Some other pick",
                    md: 800,
                } as WellborePick_api,
                {
                    pickIdentifier: "Some other stacked pick",
                    md: 1500,
                } as WellborePick_api,
            ],
        };

        it("should give null on empty collection list", () => {
            const wellpickProps = createLogViewerWellPicks([]);

            expect(wellpickProps).toBe(null);
        });

        it("should generate wellpick props from wellpick data", () => {
            const wellpickProps = createLogViewerWellPicks([mockWellPickCollection1]);

            expect(wellpickProps?.wellpick.curves).toEqual([
                MAIN_AXIS_CURVE,
                {
                    name: "PICK",
                    valueType: "string",
                    dimensions: 1,
                },
            ]);

            expect(wellpickProps?.wellpick.data).toEqual([
                [1000, "Some pick"],
                [1500, "A units entry-pick"],
                [2000, "A units exit-pick"],
            ]);
        });

        it("should merge stacked well-picks", () => {
            const collectionWithStacked = {
                ...mockWellPickCollection1,
                picks: [
                    ...mockWellPickCollection1.picks,
                    {
                        pickIdentifier: "A stacked pick",
                        md: 1500,
                    } as WellborePick_api,
                ],
            };

            const wellpickProps = createLogViewerWellPicks([collectionWithStacked]);

            expect(wellpickProps?.wellpick.data).toEqual([
                [1000, "Some pick"],
                [1500, "A units entry-pick + A stacked pick"],
                [2000, "A units exit-pick"],
            ]);
        });

        it("Should merge picks from multiple collections", () => {
            const wellpickProps = createLogViewerWellPicks([mockWellPickCollection1, mockWellPickCollection2]);

            expect(wellpickProps?.wellpick.data).toEqual([
                [800, "Some other pick"],
                [1000, "Some pick"],
                [1500, "A units entry-pick + Some other stacked pick"],
                [2000, "A units exit-pick"],
            ]);
        });
    });
});
