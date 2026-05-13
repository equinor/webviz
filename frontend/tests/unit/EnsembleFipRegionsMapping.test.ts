import { describe, expect, test } from "vitest";

import { EnsembleFipRegionsMapping } from "@framework/EnsembleFipRegionsMapping";
import type { FipRegionMapping } from "@framework/EnsembleFipRegionsMapping";

const SAMPLE_FIP_REGIONS_MAPPING: FipRegionMapping[] = [
    { fipNumber: 1, zone: "Valysar", region: "WestLowland" },
    { fipNumber: 2, zone: "Valysar", region: "CentralSouth" },
    { fipNumber: 3, zone: "Valysar", region: "CentralNorth" },
    { fipNumber: 4, zone: "Valysar", region: "NorthHorst" },
    { fipNumber: 5, zone: "Valysar", region: "CentralRamp" },
    { fipNumber: 6, zone: "Valysar", region: "CentralHorst" },
    { fipNumber: 7, zone: "Valysar", region: "EastLowland" },
    { fipNumber: 8, zone: "Therys", region: "WestLowland" },
    { fipNumber: 9, zone: "Therys", region: "CentralSouth" },
    { fipNumber: 10, zone: "Therys", region: "CentralNorth" },
    { fipNumber: 11, zone: "Therys", region: "NorthHorst" },
    { fipNumber: 12, zone: "Therys", region: "CentralRamp" },
    { fipNumber: 13, zone: "Therys", region: "CentralHorst" },
    { fipNumber: 14, zone: "Therys", region: "EastLowland" },
    { fipNumber: 15, zone: "Volon", region: "WestLowland" },
    { fipNumber: 16, zone: "Volon", region: "CentralSouth" },
    { fipNumber: 17, zone: "Volon", region: "CentralNorth" },
    { fipNumber: 18, zone: "Volon", region: "NorthHorst" },
    { fipNumber: 19, zone: "Volon", region: "CentralRamp" },
    { fipNumber: 20, zone: "Volon", region: "CentralHorst" },
    { fipNumber: 21, zone: "Volon", region: "EastLowland" },
];

describe("EnsembleFipRegionsMapping", () => {
    const mapping = new EnsembleFipRegionsMapping(SAMPLE_FIP_REGIONS_MAPPING);

    test("maps zone+region to fipNumber", () => {
        expect(mapping.getFipNumberForZoneRegion("Valysar", "CentralNorth")).toBe(3);
        expect(mapping.getFipNumberForZoneRegion("Therys", "EastLowland")).toBe(14);
        expect(mapping.getFipNumberForZoneRegion("Volon", "CentralHorst")).toBe(20);
        expect(mapping.getFipNumberForZoneRegion("Volon", "UnknownRegion")).toBeUndefined();
    });

    test("maps fipNumber to zone+region", () => {
        expect(mapping.getZoneRegionForFipNumber(1)).toEqual({ zone: "Valysar", region: "WestLowland" });
        expect(mapping.getZoneRegionForFipNumber(12)).toEqual({ zone: "Therys", region: "CentralRamp" });
        expect(mapping.getZoneRegionForFipNumber(21)).toEqual({ zone: "Volon", region: "EastLowland" });
        expect(mapping.getZoneRegionForFipNumber(99)).toBeUndefined();
    });

    test("returns unique fip numbers, zones and regions", () => {
        expect(mapping.getFipNumbers()).toEqual([
            1, 2, 3, 4, 5, 6, 7,
            8, 9, 10, 11, 12, 13, 14,
            15, 16, 17, 18, 19, 20, 21,
        ]);
        expect(mapping.getZones()).toEqual(["Valysar", "Therys", "Volon"]);
        expect(mapping.getRegions()).toEqual([
            "WestLowland",
            "CentralSouth",
            "CentralNorth",
            "NorthHorst",
            "CentralRamp",
            "CentralHorst",
            "EastLowland",
        ]);
    });

    test("filters regions for selected zones", () => {
        expect(mapping.getRegionsForZones(["Valysar"])).toEqual([
            "WestLowland",
            "CentralSouth",
            "CentralNorth",
            "NorthHorst",
            "CentralRamp",
            "CentralHorst",
            "EastLowland",
        ]);

        expect(mapping.getRegionsForZones(["Valysar", "Therys"]).length).toBe(7);
        expect(mapping.getRegionsForZones([]).length).toBe(7);
    });

    test("filters zones for selected regions", () => {
        expect(mapping.getZonesForRegions(["CentralNorth"])).toEqual(["Valysar", "Therys", "Volon"]);
        expect(mapping.getZonesForRegions(["EastLowland", "WestLowland"]).length).toBe(3);
        expect(mapping.getZonesForRegions([])).toEqual(["Valysar", "Therys", "Volon"]);
    });

    test("returns raw mapping array", () => {
        expect(mapping.getFipRegionsMappingArr()).toEqual(SAMPLE_FIP_REGIONS_MAPPING);
    });
});
