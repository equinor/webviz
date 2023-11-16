import { simulationUnitReformat, simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

import { describe, expect, test } from "vitest";

describe("Reservoir Simulation string utils tests", () => {
    test("Test simulationVectorDescription", () => {
        expect(simulationVectorDescription("INVALID_VECTOR")).toEqual("INVALID_VECTOR");
        expect(simulationVectorDescription("WOPR:A1")).toEqual("Oil Production Rate, well A1");
        expect(simulationVectorDescription("FGIP")).toEqual("Gas In Place (liquid+gas phase)");
        expect(simulationVectorDescription("RGPT:1")).toEqual("Gas Production Total, region 1");
        expect(simulationVectorDescription("GGOR:OP")).toEqual("Gas-Oil Ratio, group OP");
        expect(simulationVectorDescription("WOPRL__2:A2")).toEqual("Oil Flow Rate, well A2 completion 2");
    });

    test("Test default unit system reformat", () => {
        expect(simulationUnitReformat("INVALID_UNIT")).toEqual("INVALID_UNIT");
        expect(simulationUnitReformat("M3")).toEqual("m³");
        expect(simulationUnitReformat("SM3/DAY")).toEqual("Sm³/day");
    });

    test("Test metric unit system reformat", () => {
        expect(simulationUnitReformat("INVALID_UNIT", "METRIC")).toEqual("INVALID_UNIT");
        expect(simulationUnitReformat("M3", "METRIC")).toEqual("m³");
        expect(simulationUnitReformat("SM3/DAY", "METRIC")).toEqual("Sm³/day");
    });

    test("Test invalid unit system reformat", () => {
        expect(simulationUnitReformat("INVALID_UNIT", "INVALID_UNIT_SYSTEM")).toEqual("INVALID_UNIT");
        expect(simulationUnitReformat("M3", "INVALID_UNIT_SYSTEM")).toEqual("M3");
        expect(simulationUnitReformat("SM3/DAY", "INVALID_UNIT_SYSTEM")).toEqual("SM3/DAY");
    });
});
