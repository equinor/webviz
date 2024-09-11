import { WellboreLogCurveData_api, WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { MAIN_AXIS_CURVE, SECONDARY_AXIS_CURVE, createWellLog } from "@modules/WellLogViewer/utils/queryDataTransform";

import { describe, expect, test } from "vitest";

describe("QueryDataTransform tests", () => {
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
    };

    const mockTrajectory = {
        mdArr: [1000, 2000],
    } as WellboreTrajectory_api;

    const mockReferenceSystem = {
        project: (md: number) => [md, md * 0.1],
    } as IntersectionReferenceSystem;

    test("should create a well log with the correct header, curves, and data", () => {
        const wellLog = createWellLog([mockCurveData], mockTrajectory, mockReferenceSystem);

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

    test("should handle missing curve data", () => {
        const curveData = { ...mockCurveData, dataPoints: mockDataPointsWithMissing };

        const wellLog = createWellLog([curveData], mockTrajectory, mockReferenceSystem);

        expect(wellLog.data).toEqual([
            [1000, 100, 50],
            [2000, 200, null],
        ]);
    });

    test("should gracefully handle invalid index values", () => {
        const curveData = {
            ...mockCurveData,
            dataPoints: [
                [null, 50],
                [null, 60],
            ],
        };

        const wellLog = createWellLog([curveData], mockTrajectory, mockReferenceSystem);

        expect(wellLog.data).toEqual([]);
    });

    test("should handle multiple curves correctly", () => {
        const secondCurveData: WellboreLogCurveData_api = {
            name: "RHOB",
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
            dataPoints: [
                [1000, 2.3],
                [2000, 2.4],
            ],
        };
        const wellLog = createWellLog([mockCurveData, secondCurveData], mockTrajectory, mockReferenceSystem);

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

    test("should handle multiple dimensions correctly", () => {
        const curveData = {
            ...mockCurveData,
            dataPoints: [
                [1000, 50, 1111],
                [2000, 60, 2222],
            ],
        };

        const wellLog = createWellLog([curveData], mockTrajectory, mockReferenceSystem);

        expect(wellLog.curves[2].dimensions).toBe(1);
        expect(wellLog.data).toEqual([
            [1000, 100, 50],
            [2000, 200, 60],
        ]);
    });

    // Is this test necessary, or is it just an issue types not being strict enough?
    // - If an mdArr is successfully returned, can it EVER be empty?
    // - Can intersectionReferenceSystem.project() ever return an empty array?
    test("should handle missing mdArr and refferenceSystem values", () => {
        // @ts-expect-error Explicitly testing the case where md-array is empty
        const brokenTrajectory = {
            mdArr: [],
        } as WellboreTrajectory_api;

        // @ts-expect-error Explicitly testing the case where the project return is empty
        const brokenReferenceSystem = {
            project: () => [] as number[],
        } as IntersectionReferenceSystem;

        const wellLog = createWellLog([mockCurveData], brokenTrajectory, brokenReferenceSystem);

        expect(wellLog.header.startIndex).toBe(0);
        expect(wellLog.header.endIndex).toBe(4000);

        expect(wellLog.data).toEqual([
            [1000, 0, 50],
            [2000, 0, 60],
        ]);
    });
});
