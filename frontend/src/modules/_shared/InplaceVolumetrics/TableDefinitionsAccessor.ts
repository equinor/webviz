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
    if (tableDefinitionsPerEnsembleIdent.length === 0) {
        return [];
    }

    const tableNamesIntersection: Set<string> = new Set();
    for (const [index, tableDefinition] of tableDefinitionsPerEnsembleIdent.entries()) {
        if (index === 0) {
            // Initialize intersection of table names
            tableDefinition.tableDefinitions.forEach((el) => tableNamesIntersection.add(el.tableName));
            continue;
        }

        // If intersection is empty, there is no need to continue
        if (tableNamesIntersection.size === 0) {
            return [];
        }

        // Update intersection of table names
        const newTableNames = new Set(tableDefinition.tableDefinitions.map((el) => el.tableName));
        for (const tableName of tableNamesIntersection) {
            if (!newTableNames.has(tableName)) {
                tableNamesIntersection.delete(tableName);
            }
        }
    }

    return Array.from(tableNamesIntersection);
}

export class TableDefinitionsAccessor {
    private _tableDefinitions: InplaceVolumetricsTableDefinition_api[];
    private _tableNamesFilter: string[];
    private _uniqueEnsembleIdents: EnsembleIdent[];
    private _tableNamesIntersection: string[];
    private _fluidZonesIntersection: FluidZone_api[] = [];
    private _resultNamesIntersection: InplaceVolumetricResultName_api[] = [];
    private _identifiersWithIntersectionValues: InplaceVolumetricsIdentifierWithValues_api[] = [];
    private _tablesNotComparable: boolean = false;

    constructor(tableDefinitionsPerEnsembleIdent: TableDefinitionsForEnsembleIdent[], tableNamesFilter?: string[]) {
        this._tableDefinitions = tableDefinitionsPerEnsembleIdent.flatMap((data) => data.tableDefinitions);
        this._tableNamesFilter = tableNamesFilter ?? [];
        this._uniqueEnsembleIdents = tableDefinitionsPerEnsembleIdent.map((data) => data.ensembleIdent);
        this._tableNamesIntersection = makeUniqueTableNamesIntersection(tableDefinitionsPerEnsembleIdent);
        this.makeIntersections();
    }

    private makeIntersections(): void {
        const fluidZones: Set<FluidZone_api> = new Set();
        const resultNames: Set<InplaceVolumetricResultName_api> = new Set();
        let identifiersWithValuesIntersection: InplaceVolumetricsIdentifierWithValues_api[] = [];

        let index = 0;
        for (const tableDefinition of this._tableDefinitions) {
            if (this._tableNamesFilter && !this._tableNamesFilter.includes(tableDefinition.tableName)) {
                continue;
            }

            if (index === 0) {
                // Initialize sets and arrays with the first valid tableDefinition
                tableDefinition.fluidZones.forEach((fluidZone) => fluidZones.add(fluidZone));
                tableDefinition.resultNames.forEach((resultName) => resultNames.add(resultName));

                for (const identifierWithValues of tableDefinition.identifiersWithValues) {
                    const existingIdentifierWithValues = identifiersWithValuesIntersection.find(
                        (el) => el.identifier === identifierWithValues.identifier
                    );
                    if (existingIdentifierWithValues) {
                        throw new Error(`Duplicate identifier ${identifierWithValues.identifier}`);
                    }

                    identifiersWithValuesIntersection.push(identifierWithValues);
                }
                index++;
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

            for (const identifierWithIntersectionValues of identifiersWithValuesIntersection) {
                const currentIdentifierWithValues = tableDefinition.identifiersWithValues.find(
                    (item) => item.identifier === identifierWithIntersectionValues.identifier
                );

                if (!currentIdentifierWithValues) {
                    // Identifier is not present in the current tableDefinition, an intersection is not possible
                    this._tablesNotComparable = true;
                    break;
                }

                // Update values of the identifier
                identifierWithIntersectionValues.values = identifierWithIntersectionValues.values.filter((value) =>
                    currentIdentifierWithValues.values.includes(value)
                );

                if (identifierWithIntersectionValues.values.length === 0) {
                    // Intersection is empty, an intersection is not possible
                    this._tablesNotComparable = true;
                    break;
                }
            }
            index++;
        }

        this._fluidZonesIntersection = Array.from(fluidZones).sort();
        this._resultNamesIntersection = Array.from(resultNames).sort();
        this._identifiersWithIntersectionValues = identifiersWithValuesIntersection.sort();
    }

    getUniqueEnsembleIdents(): EnsembleIdent[] {
        return this._uniqueEnsembleIdents;
    }

    getTableNamesIntersection(): string[] {
        return this._tableNamesIntersection;
    }

    getFluidZonesIntersection(): FluidZone_api[] {
        return this._fluidZonesIntersection;
    }

    getResultNamesIntersection(): InplaceVolumetricResultName_api[] {
        return this._resultNamesIntersection;
    }

    getIdentifiersWithIntersectionValues(): InplaceVolumetricsIdentifierWithValues_api[] {
        return this._identifiersWithIntersectionValues;
    }

    getAreTablesComparable(): boolean {
        return !this._tablesNotComparable;
    }
}
