import {
    FluidZone_api,
    InplaceVolumetricResponseNames_api,
    InplaceVolumetricsIndex_api,
    InplaceVolumetricsTableDefinition_api,
} from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

type TableDefinitionForEnsembleIdent = {
    ensembleIdent: EnsembleIdent;
    tableDefinitions: InplaceVolumetricsTableDefinition_api[];
};

export function makeUniqueTableNamesIntersection(
    tableDefinitionsPerEnsembleIdent: TableDefinitionForEnsembleIdent[]
): string[] {
    const tableNames: Set<string> = new Set();
    for (const tableDefinitionForEnsembleIdent of tableDefinitionsPerEnsembleIdent) {
        if (tableNames.size === 0) {
            for (const tableDefinition of tableDefinitionForEnsembleIdent.tableDefinitions) {
                tableNames.add(tableDefinition.table_name);
            }
            continue;
        }

        for (const tableDefinition of tableDefinitionForEnsembleIdent.tableDefinitions) {
            if (!tableNames.has(tableDefinition.table_name)) {
                tableNames.delete(tableDefinition.table_name);
            }
        }
    }

    return Array.from(tableNames);
}

export class InplaceVolumetricsTableDefinitionsAccessor {
    private _tableDefinitions: InplaceVolumetricsTableDefinition_api[];
    private _tableNamesFilter: string[];
    private _uniqueTableNames: string[];
    private _uniqueFluidZones: FluidZone_api[] = [];
    private _uniqueResponses: InplaceVolumetricResponseNames_api[] = [];
    private _uniqueIndexFilterValues: InplaceVolumetricsIndex_api[] = [];

    constructor(tableDefinitionsPerEnsembleIdent: TableDefinitionForEnsembleIdent[], tableNamesFilter?: string[]) {
        this._tableDefinitions = tableDefinitionsPerEnsembleIdent.flatMap((data) => data.tableDefinitions);
        this._tableNamesFilter = tableNamesFilter ?? [];
        this._uniqueTableNames = makeUniqueTableNamesIntersection(tableDefinitionsPerEnsembleIdent);
        this.makeIntersections();
    }

    private makeIntersections(): void {
        const fluidZones: Set<FluidZone_api> = new Set();
        const resultNames: Set<InplaceVolumetricResponseNames_api> = new Set();
        let indexFilterValues: InplaceVolumetricsIndex_api[] = [];

        for (const tableDefinition of this._tableDefinitions) {
            if (this._tableNamesFilter && !this._tableNamesFilter.includes(tableDefinition.table_name)) {
                continue;
            }

            if (fluidZones.size === 0) {
                for (const fluidZone of tableDefinition.fluid_zones) {
                    fluidZones.add(fluidZone);
                }
                for (const resultName of tableDefinition.result_names) {
                    resultNames.add(resultName);
                }

                for (const indexDef of tableDefinition.indexes) {
                    const index = indexFilterValues.find((index) => index.index_name === indexDef.index_name);
                    if (!index) {
                        indexFilterValues.push(indexDef);
                        continue;
                    }

                    index.values = indexDef.values;
                }
                continue;
            }

            for (const fluidZone of fluidZones) {
                if (!tableDefinition.fluid_zones.includes(fluidZone)) {
                    fluidZones.delete(fluidZone);
                }
            }

            for (const resultName of resultNames) {
                if (!tableDefinition.result_names.includes(resultName)) {
                    resultNames.delete(resultName);
                }
            }

            indexFilterValues = indexFilterValues.filter((el) => {
                const indexDef = tableDefinition.indexes.find((index) => index.index_name === el.index_name);
                if (!indexDef) {
                    return false;
                }

                el.values = el.values.filter((value) => indexDef.values.includes(value));

                return true;
            });
        }

        this._uniqueFluidZones = Array.from(fluidZones).sort();
        this._uniqueResponses = Array.from(resultNames).sort();
        this._uniqueIndexFilterValues = indexFilterValues.sort();
    }

    setTableNamesFilter(tableNamesFilter: string[]): void {
        this._tableNamesFilter = tableNamesFilter;
        this.makeIntersections();
    }

    getUniqueTableNames(): string[] {
        return this._uniqueTableNames;
    }

    getUniqueFluidZones(): string[] {
        return this._uniqueFluidZones;
    }

    getUniqueResultNames(): InplaceVolumetricResponseNames_api[] {
        return this._uniqueResponses;
    }

    getUniqueIndexFilterValues(): InplaceVolumetricsIndex_api[] {
        return this._uniqueIndexFilterValues;
    }
}
