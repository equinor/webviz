import { describe, expect, test } from "vitest";

import type { InplaceVolumesTableDefinition_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IndexValueCriteria, TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { makeColorByOptions, makeSubplotByOptions } from "@modules/InplaceVolumesNew/settings/utils/plotDimensionUtils";

const ENSEMBLE_A = new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "iter-0");
const ENSEMBLE_B = new RegularEnsembleIdent("22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", "iter-0");

const INDICES = [
    { indexColumn: "ZONE", values: ["A", "B"] },
    { indexColumn: "FLUID", values: ["oil", "gas"] },
];

function makeDefinitions(tableNames: string[]): InplaceVolumesTableDefinition_api[] {
    return tableNames.map((tableName) => ({ tableName, resultNames: ["STOIIP"], indicesWithValues: INDICES }));
}

function makeAccessor(ensembleIdents: RegularEnsembleIdent[], tableNames: string[]): TableDefinitionsAccessor {
    return new TableDefinitionsAccessor(
        ensembleIdents.map((ensembleIdent) => ({ ensembleIdent, tableDefinitions: makeDefinitions(tableNames) })),
        tableNames,
        IndexValueCriteria.REQUIRE_EQUALITY,
    );
}

function subplotValues(ensembles: RegularEnsembleIdent[], tables: string[], sensitivity: boolean): string[] {
    return makeSubplotByOptions(makeAccessor(ensembles, tables), tables, sensitivity).map((option) => option.value);
}

function colorValues(
    ensembles: RegularEnsembleIdent[],
    tables: string[],
    subplotBy: string,
    sensitivity: boolean,
): string[] {
    return makeColorByOptions(makeAccessor(ensembles, tables), subplotBy, tables, sensitivity).map(
        (option) => option.value,
    );
}

const ALL_WITHOUT_SENSITIVITY = ["ENSEMBLE", "TABLE_NAME", "ZONE", "FLUID"];
const ALL_WITH_SENSITIVITY = ["ENSEMBLE", "TABLE_NAME", "SENSITIVITY", "ZONE", "FLUID"];

describe("InplaceVolumesNew plot dimension options without sensitivities", () => {
    test("1 ensemble x 1 table offers every option", () => {
        expect(subplotValues([ENSEMBLE_A], ["geogrid"], false)).toEqual(ALL_WITHOUT_SENSITIVITY);
        expect(colorValues([ENSEMBLE_A], ["geogrid"], "ENSEMBLE", false)).toEqual(ALL_WITHOUT_SENSITIVITY);
    });

    test("n ensembles x 1 table forces colour to ENSEMBLE unless subplot is ENSEMBLE", () => {
        expect(subplotValues([ENSEMBLE_A, ENSEMBLE_B], ["geogrid"], false)).toEqual(ALL_WITHOUT_SENSITIVITY);
        expect(colorValues([ENSEMBLE_A, ENSEMBLE_B], ["geogrid"], "ZONE", false)).toEqual(["ENSEMBLE"]);
        expect(colorValues([ENSEMBLE_A, ENSEMBLE_B], ["geogrid"], "ENSEMBLE", false)).toEqual(ALL_WITHOUT_SENSITIVITY);
    });

    test("1 ensemble x n tables forces colour to TABLE_NAME unless subplot is TABLE_NAME", () => {
        expect(subplotValues([ENSEMBLE_A], ["geogrid", "simgrid"], false)).toEqual(ALL_WITHOUT_SENSITIVITY);
        expect(colorValues([ENSEMBLE_A], ["geogrid", "simgrid"], "ENSEMBLE", false)).toEqual(["TABLE_NAME"]);
        expect(colorValues([ENSEMBLE_A], ["geogrid", "simgrid"], "TABLE_NAME", false)).toEqual(ALL_WITHOUT_SENSITIVITY);
    });

    test("n ensembles x n tables splits the two dimensions between subplot and colour", () => {
        const ensembles = [ENSEMBLE_A, ENSEMBLE_B];
        const tables = ["geogrid", "simgrid"];
        expect(subplotValues(ensembles, tables, false)).toEqual(["ENSEMBLE", "TABLE_NAME"]);
        expect(colorValues(ensembles, tables, "ENSEMBLE", false)).toEqual(["TABLE_NAME"]);
        expect(colorValues(ensembles, tables, "TABLE_NAME", false)).toEqual(["ENSEMBLE"]);
        expect(colorValues(ensembles, tables, "ZONE", false)).toEqual(["ENSEMBLE", "TABLE_NAME"]);
    });
});

describe("InplaceVolumesNew plot dimension options in sensitivity mode", () => {
    test("1 table: default subplot ENSEMBLE forces colour to SENSITIVITY", () => {
        expect(subplotValues([ENSEMBLE_A], ["geogrid"], true)).toEqual(ALL_WITH_SENSITIVITY);
        expect(colorValues([ENSEMBLE_A], ["geogrid"], "ENSEMBLE", true)).toEqual(["SENSITIVITY"]);
        expect(colorValues([ENSEMBLE_A], ["geogrid"], "SENSITIVITY", true)).toEqual(ALL_WITH_SENSITIVITY);
    });

    test("n tables: subplot is TABLE_NAME or SENSITIVITY and colour is forced to the other", () => {
        const tables = ["geogrid", "simgrid"];
        expect(subplotValues([ENSEMBLE_A], tables, true)).toEqual(["TABLE_NAME", "SENSITIVITY"]);
        expect(colorValues([ENSEMBLE_A], tables, "TABLE_NAME", true)).toEqual(["SENSITIVITY"]);
        expect(colorValues([ENSEMBLE_A], tables, "SENSITIVITY", true)).toEqual(["TABLE_NAME"]);
    });

    test("SENSITIVITY is not offered when the mode is off", () => {
        expect(subplotValues([ENSEMBLE_A], ["geogrid"], false)).not.toContain("SENSITIVITY");
        expect(colorValues([ENSEMBLE_A], ["geogrid"], "ENSEMBLE", false)).not.toContain("SENSITIVITY");
    });
});
