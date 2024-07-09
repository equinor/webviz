import {
    FluidZone_api,
    InplaceVolumetricResultName_api,
    InplaceVolumetricsIdentifierWithValues_api,
    InplaceVolumetricsTableDefinition_api,
} from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

type TableDefinitionsForEnsembleIdent = {
    ensembleIdent: EnsembleIdent;
    tableDefinitions: InplaceVolumetricsTableDefinition_api[];
};

export function makeUniqueTableNamesIntersection(
    tableDefinitionsPerEnsembleIdent: TableDefinitionsForEnsembleIdent[]
): string[] {
    const tableNames: Set<string> = new Set();
    for (const tableDefinitionForEnsembleIdent of tableDefinitionsPerEnsembleIdent) {
        if (tableNames.size === 0) {
            for (const tableDefinition of tableDefinitionForEnsembleIdent.tableDefinitions) {
                tableNames.add(tableDefinition.tableName);
            }
            continue;
        }

        for (const tableDefinition of tableDefinitionForEnsembleIdent.tableDefinitions) {
            if (!tableNames.has(tableDefinition.tableName)) {
                tableNames.delete(tableDefinition.tableName);
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
    private _uniqueResults: InplaceVolumetricResultName_api[] = [];
    private _uniqueIdentifierValues: InplaceVolumetricsIdentifierWithValues_api[] = [];

    constructor(tableDefinitionsPerEnsembleIdent: TableDefinitionsForEnsembleIdent[], tableNamesFilter?: string[]) {
        this._tableDefinitions = tableDefinitionsPerEnsembleIdent.flatMap((data) => data.tableDefinitions);
        this._tableNamesFilter = tableNamesFilter ?? [];
        this._uniqueTableNames = makeUniqueTableNamesIntersection(tableDefinitionsPerEnsembleIdent);
        this.makeIntersections();
    }

    private makeIntersections(): void {
        const fluidZones: Set<FluidZone_api> = new Set();
        const resultNames: Set<InplaceVolumetricResultName_api> = new Set();
        let identifiersWithValues: InplaceVolumetricsIdentifierWithValues_api[] = [];

        for (const tableDefinition of this._tableDefinitions) {
            if (this._tableNamesFilter && !this._tableNamesFilter.includes(tableDefinition.tableName)) {
                continue;
            }

            if (fluidZones.size === 0) {
                for (const fluidZone of tableDefinition.fluidZones) {
                    fluidZones.add(fluidZone);
                }
                for (const resultName of tableDefinition.resultNames) {
                    resultNames.add(resultName);
                }

                for (const identifierWithValues of tableDefinition.identifiersWithValues) {
                    const existingIdentifierWithValues = identifiersWithValues.find(
                        (el) => el.identifier === identifierWithValues.identifier
                    );
                    if (existingIdentifierWithValues) {
                        throw new Error(`Duplicate identifier ${identifierWithValues.identifier}`);
                    }

                    identifiersWithValues.push(identifierWithValues);
                }
                continue;
            }

            for (const fluidZone of fluidZones) {
                if (!tableDefinition.fluidZones.includes(fluidZone)) {
                    fluidZones.delete(fluidZone);
                }
            }

            for (const resultName of resultNames) {
                if (!tableDefinition.resultNames.includes(resultName)) {
                    resultNames.delete(resultName);
                }
            }

            identifiersWithValues = identifiersWithValues.filter((el) => {
                const existingIdentifierWithValues = tableDefinition.identifiersWithValues.find(
                    (item) => item.identifier === el.identifier
                );
                if (!existingIdentifierWithValues) {
                    return false;
                }

                el.values = el.values.filter((value) => existingIdentifierWithValues.values.includes(value));

                return true;
            });
        }

        this._uniqueFluidZones = Array.from(fluidZones).sort();
        this._uniqueResults = Array.from(resultNames).sort();
        this._uniqueIdentifierValues = identifiersWithValues.sort();
    }

    getUniqueTableNames(): string[] {
        return this._uniqueTableNames;
    }

    getUniqueFluidZones(): FluidZone_api[] {
        return this._uniqueFluidZones;
    }

    getUniqueResultNames(): InplaceVolumetricResultName_api[] {
        return this._uniqueResults;
    }

    getUniqueIdentifierValues(): InplaceVolumetricsIdentifierWithValues_api[] {
        return this._uniqueIdentifierValues;
    }
}
