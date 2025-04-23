import { isEqual } from "lodash";

import type {
    FluidZone_api,
    InplaceVolumetricResultName_api,
    InplaceVolumetricsIdentifierWithValues_api,
    InplaceVolumetricsIdentifier_api,
    InplaceVolumetricsTableDefinition_api,
} from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";


import { sortResultNames } from "./sortResultNames";

type TableDefinitionsForEnsembleIdent = {
    ensembleIdent: RegularEnsembleIdent;
    tableDefinitions: InplaceVolumetricsTableDefinition_api[];
};

export function makeUniqueTableNamesIntersection(
    tableDefinitionsPerEnsembleIdent: TableDefinitionsForEnsembleIdent[],
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

// Defines how to handle identifier values among table definitions
export enum IdentifierValueCriteria {
    ALLOW_INTERSECTION = "allow_intersection",
    REQUIRE_EQUALITY = "require_equality",
}

export class TableDefinitionsAccessor {
    private _tableDefinitions: InplaceVolumetricsTableDefinition_api[];
    private _tableNamesFilter: string[];
    private _uniqueEnsembleIdents: RegularEnsembleIdent[];
    private _tableNamesIntersection: string[];
    private _fluidZonesIntersection: FluidZone_api[] = [];
    private _resultNamesIntersection: InplaceVolumetricResultName_api[] = [];

    private _commonIdentifiersWithValues: InplaceVolumetricsIdentifierWithValues_api[] = [];
    private _identifierValueCriteria: IdentifierValueCriteria;

    private _tablesNotComparable: boolean = false;

    constructor(
        tableDefinitionsPerEnsembleIdent: TableDefinitionsForEnsembleIdent[],
        tableNamesFilter: string[],
        identifierValueCriteria: IdentifierValueCriteria,
    ) {
        this._tableDefinitions = tableDefinitionsPerEnsembleIdent.flatMap((data) => data.tableDefinitions);
        this._tableNamesFilter = tableNamesFilter;

        this._uniqueEnsembleIdents = tableDefinitionsPerEnsembleIdent.map((data) => data.ensembleIdent);
        this._tableNamesIntersection = makeUniqueTableNamesIntersection(tableDefinitionsPerEnsembleIdent);
        this._identifierValueCriteria = identifierValueCriteria;

        this.makeIntersections();
    }

    private makeIntersections(): void {
        if (this._tableDefinitions.length === 0) {
            return;
        }

        const fluidZones: Set<FluidZone_api> = new Set();
        const resultNames: Set<InplaceVolumetricResultName_api> = new Set();
        const commonIdentifiersWithValuesMap: Map<
            InplaceVolumetricsIdentifier_api,
            InplaceVolumetricsIdentifierWithValues_api
        > = new Map();

        let isInitialized = false;
        for (const tableDefinition of this._tableDefinitions) {
            if (this._tableNamesFilter && !this._tableNamesFilter.includes(tableDefinition.tableName)) {
                continue;
            }

            if (!isInitialized) {
                // Initialize sets and arrays with the first valid tableDefinition
                tableDefinition.fluidZones.forEach((fluidZone) => fluidZones.add(fluidZone));
                tableDefinition.resultNames.forEach((resultName) => resultNames.add(resultName));

                for (const identifierWithValues of tableDefinition.identifiersWithValues) {
                    if (commonIdentifiersWithValuesMap.has(identifierWithValues.identifier)) {
                        throw new Error(`Duplicate identifier ${identifierWithValues.identifier}`);
                    }
                    commonIdentifiersWithValuesMap.set(identifierWithValues.identifier, identifierWithValues);
                }

                isInitialized = true;
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

            const identifiersToRemove = [];
            for (const [identifier, identifierWithValues] of commonIdentifiersWithValuesMap) {
                const currentIdentifierWithValues = tableDefinition.identifiersWithValues.find(
                    (item) => item.identifier === identifier,
                );

                // Remove identifiers that are not present in all table definitions
                if (!currentIdentifierWithValues) {
                    identifiersToRemove.push(identifier);
                    continue;
                }

                // Tables are not comparable when identifier values are not equal
                if (this._identifierValueCriteria === IdentifierValueCriteria.ALLOW_INTERSECTION) {
                    const valuesIntersection = identifierWithValues.values.filter((value) =>
                        currentIdentifierWithValues.values.includes(value),
                    );

                    // Set or update existing identifier with intersected values
                    commonIdentifiersWithValuesMap.set(identifier, {
                        identifier,
                        values: valuesIntersection,
                    });
                } else if (!isEqual(identifierWithValues.values.sort(), currentIdentifierWithValues.values.sort())) {
                    this._tablesNotComparable = true;
                    break;
                }
            }

            // Remove identifiers that are not common among all table definitions
            for (const identifier of identifiersToRemove) {
                commonIdentifiersWithValuesMap.delete(identifier);
            }
        }

        this._fluidZonesIntersection = Array.from(fluidZones).sort();
        this._resultNamesIntersection = sortResultNames(Array.from(resultNames));
        this._commonIdentifiersWithValues = Array.from(commonIdentifiersWithValuesMap.values());

        // Not comparable if there are no common identifiers
        if (this._commonIdentifiersWithValues.length === 0) {
            this._tablesNotComparable = true;
        }
    }

    getUniqueEnsembleIdents(): RegularEnsembleIdent[] {
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

    getCommonIdentifiersWithValues(): InplaceVolumetricsIdentifierWithValues_api[] {
        return this._commonIdentifiersWithValues;
    }

    getAreTablesComparable(): boolean {
        return !this._tablesNotComparable;
    }

    hasEnsembleIdents(ensembleIdents: RegularEnsembleIdent[]): boolean {
        for (const ensembleIdent of ensembleIdents) {
            if (!this._uniqueEnsembleIdents.includes(ensembleIdent)) {
                return false;
            }
        }

        return true;
    }

    hasTableNames(tableNames: string[]): boolean {
        for (const tableName of tableNames) {
            if (!this._tableNamesIntersection.includes(tableName)) {
                return false;
            }
        }

        return true;
    }

    hasFluidZones(fluidZones: FluidZone_api[]): boolean {
        for (const fluidZone of fluidZones) {
            if (!this._fluidZonesIntersection.includes(fluidZone)) {
                return false;
            }
        }

        return true;
    }

    hasResultNames(resultNames: InplaceVolumetricResultName_api[]): boolean {
        for (const resultName of resultNames) {
            if (!this._resultNamesIntersection.includes(resultName)) {
                return false;
            }
        }

        return true;
    }

    hasResultName(resultName: InplaceVolumetricResultName_api): boolean {
        return this._resultNamesIntersection.includes(resultName);
    }

    hasIdentifiersWithValues(identifiersWithValues: InplaceVolumetricsIdentifierWithValues_api[]): boolean {
        for (const identifierValue of identifiersWithValues) {
            const identifier = identifierValue.identifier;
            const tableDefinitionsIdentifier = this._commonIdentifiersWithValues.find(
                (el) => el.identifier === identifier,
            );
            if (!tableDefinitionsIdentifier) {
                return false;
            }

            for (const value of identifierValue.values) {
                if (!tableDefinitionsIdentifier.values.includes(value)) {
                    return false;
                }
            }
        }

        return true;
    }
}
