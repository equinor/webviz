import { isEqual } from "lodash";

import type {
    InplaceVolumesIndex_api,
    InplaceVolumesIndexWithValues_api,
    InplaceVolumesTableDefinition_api,
} from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { sortResultNameStrings } from "./sortResultNames";

type TableDefinitionsForEnsembleIdent = {
    ensembleIdent: RegularEnsembleIdent;
    tableDefinitions: InplaceVolumesTableDefinition_api[];
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

// Defines how to handle indices values among table definitions
export enum IndexValueCriteria {
    ALLOW_INTERSECTION = "allow_intersection",
    REQUIRE_EQUALITY = "require_equality",
}

export class TableDefinitionsAccessor {
    private _tableDefinitions: InplaceVolumesTableDefinition_api[];
    private _tableNamesFilter: string[];
    private _uniqueEnsembleIdents: RegularEnsembleIdent[];
    private _tableNamesIntersection: string[];
    private _resultNamesIntersection: string[] = [];

    private _commonIndicesWithValues: InplaceVolumesIndexWithValues_api[] = [];
    private _indexValueCriteria: IndexValueCriteria;

    private _tablesNotComparable: boolean = false;

    constructor(
        tableDefinitionsPerEnsembleIdent: TableDefinitionsForEnsembleIdent[],
        tableNamesFilter: string[],
        indexValueCriteria: IndexValueCriteria,
    ) {
        this._tableDefinitions = tableDefinitionsPerEnsembleIdent.flatMap((data) => data.tableDefinitions);
        this._tableNamesFilter = tableNamesFilter;

        this._uniqueEnsembleIdents = tableDefinitionsPerEnsembleIdent.map((data) => data.ensembleIdent);
        this._tableNamesIntersection = makeUniqueTableNamesIntersection(tableDefinitionsPerEnsembleIdent);
        this._indexValueCriteria = indexValueCriteria;

        this.makeIntersections();
    }

    private makeIntersections(): void {
        if (this._tableDefinitions.length === 0) {
            return;
        }

        const resultNames: Set<string> = new Set();
        const commonIndicesWithValuesMap: Map<InplaceVolumesIndex_api, InplaceVolumesIndexWithValues_api> = new Map();

        let isInitialized = false;
        for (const tableDefinition of this._tableDefinitions) {
            if (this._tableNamesFilter && !this._tableNamesFilter.includes(tableDefinition.tableName)) {
                continue;
            }

            if (!isInitialized) {
                // Initialize sets and arrays with the first valid tableDefinition
                tableDefinition.resultNames.forEach((resultName) => resultNames.add(resultName));

                for (const indexWithValues of tableDefinition.indicesWithValues) {
                    if (commonIndicesWithValuesMap.has(indexWithValues.indexColumn)) {
                        throw new Error(`Duplicate index ${indexWithValues.indexColumn}`);
                    }
                    commonIndicesWithValuesMap.set(indexWithValues.indexColumn, indexWithValues);
                }

                isInitialized = true;
                continue;
            }

            for (const resultName of resultNames) {
                if (!tableDefinition.resultNames.includes(resultName)) {
                    resultNames.delete(resultName);
                }
            }

            const indicesToRemove = [];
            for (const [index, indexWithValues] of commonIndicesWithValuesMap) {
                const currentIndexWithValues = tableDefinition.indicesWithValues.find(
                    (item) => item.indexColumn === index,
                );

                // Remove indices that are not present in all table definitions
                if (!currentIndexWithValues) {
                    indicesToRemove.push(index);
                    continue;
                }

                // Tables are not comparable when index values are not equal
                if (this._indexValueCriteria === IndexValueCriteria.ALLOW_INTERSECTION) {
                    const valuesIntersection = indexWithValues.values.filter((value) =>
                        currentIndexWithValues.values.includes(value),
                    );

                    // Set or update existing index with intersected values
                    commonIndicesWithValuesMap.set(index, {
                        indexColumn: index,
                        values: valuesIntersection,
                    });
                } else if (!isEqual(indexWithValues.values.sort(), currentIndexWithValues.values.sort())) {
                    this._tablesNotComparable = true;
                    break;
                }
            }

            // Remove indices that are not common among all table definitions
            for (const index of indicesToRemove) {
                commonIndicesWithValuesMap.delete(index);
            }
        }

        this._resultNamesIntersection = sortResultNameStrings(Array.from(resultNames));
        this._commonIndicesWithValues = Array.from(commonIndicesWithValuesMap.values());

        // Not comparable if there are no common indices
        if (this._commonIndicesWithValues.length === 0) {
            this._tablesNotComparable = true;
        }
    }

    getUniqueEnsembleIdents(): RegularEnsembleIdent[] {
        return this._uniqueEnsembleIdents;
    }

    getTableNamesIntersection(): string[] {
        return this._tableNamesIntersection;
    }

    getResultNamesIntersection(): string[] {
        return this._resultNamesIntersection;
    }

    getCommonIndicesWithValues(): InplaceVolumesIndexWithValues_api[] {
        return this._commonIndicesWithValues;
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

    hasResultNames(resultNames: string[]): boolean {
        for (const resultName of resultNames) {
            if (!this._resultNamesIntersection.includes(resultName)) {
                return false;
            }
        }

        return true;
    }

    hasResultName(resultName: string): boolean {
        return this._resultNamesIntersection.includes(resultName);
    }

    hasIndicesWithValues(indicesWithValues: InplaceVolumesIndexWithValues_api[]): boolean {
        for (const indexWithValues of indicesWithValues) {
            const index = indexWithValues.indexColumn;
            const tableDefinitionsIndex = this._commonIndicesWithValues.find((el) => el.indexColumn === index);
            if (!tableDefinitionsIndex) {
                return false;
            }

            for (const value of indexWithValues.values) {
                if (!tableDefinitionsIndex.values.includes(value)) {
                    return false;
                }
            }
        }

        return true;
    }
}
