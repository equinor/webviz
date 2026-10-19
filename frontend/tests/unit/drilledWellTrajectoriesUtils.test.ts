import { describe, expect, test } from "vitest";

import type { DrilledWellboreTrajectoryData } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellboreTrajectoriesProvider";
import {
    createSimplifiedTrajectory,
    FORMATION_FILTER_NAME,
    getApplicableFlowDataSetting,
    hexToRgb,
    wellDataToGeoJson,
} from "@modules/_shared/DataProviderFramework/visualization/deckgl/drilledWellTrajectoriesUtils";

function makeTrajectory(overrides: Partial<DrilledWellboreTrajectoryData> = {}): DrilledWellboreTrajectoryData {
    return {
        wellboreUuid: "wellbore-1",
        uniqueWellboreIdentifier: "Well-1",
        eastingArr: [0, 0, 0],
        northingArr: [0, 0, 0],
        tvdMslArr: [0, 50, 100],
        mdArr: [0, 50, 100],
        formationSegments: [],
        screens: [],
        perforations: [],
        wellboreStatus: "producing",
        wellborePurpose: "oil",
        productionData: null,
        injectionData: null,
        ...overrides,
    } as unknown as DrilledWellboreTrajectoryData;
}

function distanceXY(
    point1: { easting: number; northing: number },
    point2: { easting: number; northing: number },
): number {
    return Math.hypot(point1.easting - point2.easting, point1.northing - point2.northing);
}

describe("drilledWellTrajectoriesUtils", () => {
    describe("wellDataToGeoJson", () => {
        test("maps formation segments to formations[] with FORMATION_FILTER_NAME", () => {
            const trajectory = makeTrajectory({
                formationSegments: [{ mdEnter: 10, mdExit: 20 }] as DrilledWellboreTrajectoryData["formationSegments"],
            });

            const geoJson = wellDataToGeoJson([trajectory]);

            expect(geoJson.features[0].properties.formations).toEqual([
                { mdEnter: 10, mdExit: 20, name: FORMATION_FILTER_NAME },
            ]);
        });

        test("maps screens mdTop/mdBottom to mdStart/mdEnd", () => {
            const trajectory = makeTrajectory({
                screens: [
                    { symbolName: "Screen A", description: "desc", mdTop: 100, mdBottom: 120 },
                ] as DrilledWellboreTrajectoryData["screens"],
            });

            const geoJson = wellDataToGeoJson([trajectory]);

            expect(geoJson.features[0].properties.screens).toEqual([
                { name: "Screen A", description: "desc", mdStart: 100, mdEnd: 120 },
            ]);
        });

        test("maps perforations to midpoint MD and passes through status/dates", () => {
            const trajectory = makeTrajectory({
                perforations: [
                    {
                        mdTop: 100,
                        mdBottom: 120,
                        status: "open",
                        dateClosed: "2020-01-01",
                        dateShot: "2019-01-01",
                    },
                ] as DrilledWellboreTrajectoryData["perforations"],
            });

            const geoJson = wellDataToGeoJson([trajectory]);

            expect(geoJson.features[0].properties.perforations).toEqual([
                {
                    name: "Perforation",
                    md: 110,
                    status: "open",
                    dateClosed: "2020-01-01",
                    dateShot: "2019-01-01",
                },
            ]);
        });

        test("copies status, purpose and flow data", () => {
            const productionData = { oilProductionSm3: 10 } as DrilledWellboreTrajectoryData["productionData"];
            const injectionData = { waterInjection: 5 } as DrilledWellboreTrajectoryData["injectionData"];
            const trajectory = makeTrajectory({
                wellboreStatus: "producing",
                wellborePurpose: "oil",
                productionData,
                injectionData,
            });

            const geoJson = wellDataToGeoJson([trajectory]);
            const properties = geoJson.features[0].properties;

            expect(properties.status).toBe("producing");
            expect(properties.purpose).toBe("oil");
            expect(properties.productionData).toBe(productionData);
            expect(properties.injectionData).toBe(injectionData);
        });
    });

    describe("createSimplifiedTrajectory", () => {
        test("collapses a vertical section when using an XY-only distance function", () => {
            const trajectory = makeTrajectory();

            const simplified = createSimplifiedTrajectory(trajectory, distanceXY);

            expect(simplified.eastingArr).toHaveLength(2);
        });

        test("preserves a vertical section when using the default 3D distance function", () => {
            const trajectory = makeTrajectory();

            const simplified = createSimplifiedTrajectory(trajectory);

            expect(simplified.eastingArr).toHaveLength(3);
        });
    });

    describe("getApplicableFlowDataSetting", () => {
        const flowFilterSettings = {
            production: {
                oil: { value: 100, color: "#ff0000" },
                gas: { value: 100, color: "#00ff00" },
                water: { value: 100, color: "#0000ff" },
            },
            injection: {
                water: { value: 100, color: "#ffff00" },
                gas: { value: 100, color: "#00ffff" },
            },
        };

        test("prioritizes production oil over gas and water", () => {
            const result = getApplicableFlowDataSetting(
                flowFilterSettings,
                { oilProductionSm3: 200, gasProductionSm3: 200, waterProductionM3: 200 } as any,
                null,
            );

            expect(result).toBe(flowFilterSettings.production.oil);
        });

        test("prioritizes production gas over water when oil does not exceed threshold", () => {
            const result = getApplicableFlowDataSetting(
                flowFilterSettings,
                { oilProductionSm3: 0, gasProductionSm3: 200, waterProductionM3: 200 } as any,
                null,
            );

            expect(result).toBe(flowFilterSettings.production.gas);
        });

        test("falls back to injection water then gas when there is no applicable production", () => {
            const waterResult = getApplicableFlowDataSetting(
                flowFilterSettings,
                null,
                { waterInjection: 200, gasInjection: 200 } as any,
            );
            expect(waterResult).toBe(flowFilterSettings.injection.water);

            const gasResult = getApplicableFlowDataSetting(
                flowFilterSettings,
                null,
                { waterInjection: 0, gasInjection: 200 } as any,
            );
            expect(gasResult).toBe(flowFilterSettings.injection.gas);
        });

        test("returns null when nothing exceeds the configured thresholds", () => {
            const result = getApplicableFlowDataSetting(
                flowFilterSettings,
                { oilProductionSm3: 0, gasProductionSm3: 0, waterProductionM3: 0 } as any,
                { waterInjection: 0, gasInjection: 0 } as any,
            );

            expect(result).toBeNull();
        });

        test("returns null when settings are missing", () => {
            const result = getApplicableFlowDataSetting(null, { oilProductionSm3: 200 } as any, null);

            expect(result).toBeNull();
        });
    });

    describe("hexToRgb", () => {
        test("converts a valid hex color to rgb", () => {
            expect(hexToRgb("#ff0000")).toEqual([255, 0, 0]);
        });

        test("falls back to gray for an invalid hex color", () => {
            expect(hexToRgb("not-a-color")).toEqual([128, 128, 128]);
        });
    });
});
