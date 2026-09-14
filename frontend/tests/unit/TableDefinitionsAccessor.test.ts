import { describe, expect, test } from "vitest";

import type { InplaceVolumesTableDefinition_api } from "../../src/api";
import { DeltaEnsembleIdent } from "../../src/framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "../../src/framework/RegularEnsembleIdent";
import {
    IndexValueCriteria,
    TableDefinitionsAccessor,
} from "../../src/modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

const ENSEMBLE_A = new RegularEnsembleIdent("11111111-1111-4111-8111-111111111111", "iter-0");
const ENSEMBLE_B = new RegularEnsembleIdent("22222222-2222-4222-8222-222222222222", "iter-0");

// Zones are returned in stratigraphic order, which is deliberately not alphabetical
const STRATIGRAPHIC_ZONES = ["Valysar", "Therys", "Volon"];

function makeTableDefinition(zones: string[], resultNames: string[] = ["STOIIP"]): InplaceVolumesTableDefinition_api {
    return {
        tableName: "geogrid",
        resultNames,
        indicesWithValues: [{ indexColumn: "ZONE", values: [...zones] }],
    } as InplaceVolumesTableDefinition_api;
}

function makeTableDefinitionWithIndices(
    indicesWithValues: { indexColumn: string; values: string[] }[],
): InplaceVolumesTableDefinition_api {
    return {
        tableName: "geogrid",
        resultNames: ["STOIIP"],
        indicesWithValues,
    } as InplaceVolumesTableDefinition_api;
}

function getZoneValues(accessor: TableDefinitionsAccessor): string[] | undefined {
    return accessor.getCommonIndicesWithValues().find((el) => el.indexColumn === "ZONE")?.values;
}

describe("TableDefinitionsAccessor index value ordering", () => {
    test("preserves stratigraphic zone order across ensembles when requiring equality", () => {
        const accessor = new TableDefinitionsAccessor(
            [
                { ensembleIdent: ENSEMBLE_A, tableDefinitions: [makeTableDefinition(STRATIGRAPHIC_ZONES)] },
                { ensembleIdent: ENSEMBLE_B, tableDefinitions: [makeTableDefinition(STRATIGRAPHIC_ZONES)] },
            ],
            ["geogrid"],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(accessor.getAreTablesComparable()).toBe(true);
        expect(getZoneValues(accessor)).toEqual(STRATIGRAPHIC_ZONES);
    });

    test("does not mutate the source table definitions", () => {
        const tableDefinitionA = makeTableDefinition(STRATIGRAPHIC_ZONES);
        const tableDefinitionB = makeTableDefinition(STRATIGRAPHIC_ZONES);

        new TableDefinitionsAccessor(
            [
                { ensembleIdent: ENSEMBLE_A, tableDefinitions: [tableDefinitionA] },
                { ensembleIdent: ENSEMBLE_B, tableDefinitions: [tableDefinitionB] },
            ],
            ["geogrid"],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(tableDefinitionA.indicesWithValues[0].values).toEqual(STRATIGRAPHIC_ZONES);
        expect(tableDefinitionB.indicesWithValues[0].values).toEqual(STRATIGRAPHIC_ZONES);
    });

    test("treats differently ordered but equal value sets as comparable", () => {
        const accessor = new TableDefinitionsAccessor(
            [
                { ensembleIdent: ENSEMBLE_A, tableDefinitions: [makeTableDefinition(STRATIGRAPHIC_ZONES)] },
                {
                    ensembleIdent: ENSEMBLE_B,
                    tableDefinitions: [makeTableDefinition(["Volon", "Valysar", "Therys"])],
                },
            ],
            ["geogrid"],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(accessor.getAreTablesComparable()).toBe(true);
        expect(getZoneValues(accessor)).toEqual(STRATIGRAPHIC_ZONES);
    });

    test("flags tables as not comparable when value sets differ", () => {
        const accessor = new TableDefinitionsAccessor(
            [
                { ensembleIdent: ENSEMBLE_A, tableDefinitions: [makeTableDefinition(STRATIGRAPHIC_ZONES)] },
                { ensembleIdent: ENSEMBLE_B, tableDefinitions: [makeTableDefinition(["Valysar", "Therys"])] },
            ],
            ["geogrid"],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(accessor.getAreTablesComparable()).toBe(false);
    });

    test("keeps the first table's ordering when intersecting values", () => {
        const accessor = new TableDefinitionsAccessor(
            [
                { ensembleIdent: ENSEMBLE_A, tableDefinitions: [makeTableDefinition(STRATIGRAPHIC_ZONES)] },
                { ensembleIdent: ENSEMBLE_B, tableDefinitions: [makeTableDefinition(["Volon", "Valysar"])] },
            ],
            ["geogrid"],
            IndexValueCriteria.ALLOW_INTERSECTION,
        );

        expect(accessor.getAreTablesComparable()).toBe(true);
        expect(getZoneValues(accessor)).toEqual(["Valysar", "Volon"]);
    });
});

describe("TableDefinitionsAccessor index column reconciliation", () => {
    // Index columns missing from some tables are dropped in both modes, so a ZONE+REGION table
    // stays comparable with a ZONE+REGION+FACIES one
    test.each([IndexValueCriteria.REQUIRE_EQUALITY, IndexValueCriteria.ALLOW_INTERSECTION])(
        "drops index columns missing from some tables without breaking comparability (%s)",
        (indexValueCriteria) => {
            const accessor = new TableDefinitionsAccessor(
                [
                    {
                        ensembleIdent: ENSEMBLE_A,
                        tableDefinitions: [
                            makeTableDefinitionWithIndices([
                                { indexColumn: "ZONE", values: STRATIGRAPHIC_ZONES },
                                { indexColumn: "REGION", values: ["North", "South"] },
                            ]),
                        ],
                    },
                    {
                        ensembleIdent: ENSEMBLE_B,
                        tableDefinitions: [
                            makeTableDefinitionWithIndices([
                                { indexColumn: "ZONE", values: STRATIGRAPHIC_ZONES },
                                { indexColumn: "REGION", values: ["North", "South"] },
                                { indexColumn: "FACIES", values: ["Sand", "Shale"] },
                            ]),
                        ],
                    },
                ],
                ["geogrid"],
                indexValueCriteria,
            );

            expect(accessor.getAreTablesComparable()).toBe(true);
            expect(accessor.getCommonIndicesWithValues().map((el) => el.indexColumn)).toEqual(["ZONE", "REGION"]);
        },
    );

    test("intersects result names regardless of criteria", () => {
        const accessor = new TableDefinitionsAccessor(
            [
                {
                    ensembleIdent: ENSEMBLE_A,
                    tableDefinitions: [makeTableDefinition(STRATIGRAPHIC_ZONES, ["STOIIP", "BULK"])],
                },
                {
                    ensembleIdent: ENSEMBLE_B,
                    tableDefinitions: [makeTableDefinition(STRATIGRAPHIC_ZONES, ["STOIIP", "PORV"])],
                },
            ],
            ["geogrid"],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(accessor.getAreTablesComparable()).toBe(true);
        expect(accessor.getResultNamesIntersection()).toEqual(["STOIIP"]);
    });
});

describe("TableDefinitionsAccessor delta ensembles", () => {
    test("recognizes a delta when both constituent definitions are present", () => {
        const accessor = new TableDefinitionsAccessor(
            [
                { ensembleIdent: ENSEMBLE_A, tableDefinitions: [makeTableDefinition(STRATIGRAPHIC_ZONES)] },
                { ensembleIdent: ENSEMBLE_B, tableDefinitions: [makeTableDefinition(STRATIGRAPHIC_ZONES)] },
            ],
            ["geogrid"],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(accessor.hasEnsembleIdents([new DeltaEnsembleIdent(ENSEMBLE_A, ENSEMBLE_B)])).toBe(true);
    });

    test("rejects a delta when a constituent definition is missing", () => {
        const accessor = new TableDefinitionsAccessor(
            [{ ensembleIdent: ENSEMBLE_A, tableDefinitions: [makeTableDefinition(STRATIGRAPHIC_ZONES)] }],
            ["geogrid"],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(accessor.hasEnsembleIdents([new DeltaEnsembleIdent(ENSEMBLE_A, ENSEMBLE_B)])).toBe(false);
    });
});
