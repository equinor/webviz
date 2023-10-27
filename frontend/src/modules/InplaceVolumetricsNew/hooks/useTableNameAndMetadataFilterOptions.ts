import React from "react";

import { isEqual } from "lodash";

import { TableNamesAndMetaData } from "./useTableNamesAndMetadata";

export type TableNameAndMetadataFilterOptions = {
    sources: string[];
    fluidZones: string[];
    responses: string[];
    categories: Record<string, (string | number)[]>;
};

const fluidZoneRegExp = /^\w+_(?<fluidZone>\w+)$/;

export function useTableNameAndMetadataFilterOptions(
    tableNamesAndMetadata: TableNamesAndMetaData
): TableNameAndMetadataFilterOptions | null {
    const [reducedTableNamesAndMetadata, setReducedTableNamesAndMetadata] =
        React.useState<TableNameAndMetadataFilterOptions | null>(null);
    const [prevTableNamesAndMetadata, setPrevTableNamesAndMetadata] = React.useState<TableNamesAndMetaData | null>(
        null
    );

    if (!tableNamesAndMetadata.isFetching && !isEqual(prevTableNamesAndMetadata, tableNamesAndMetadata)) {
        setPrevTableNamesAndMetadata(tableNamesAndMetadata);
        const newReducedTableNamesAndMetadata: TableNameAndMetadataFilterOptions = {
            sources: [],
            fluidZones: [],
            responses: [],
            categories: {},
        };

        for (const tableNamesAndMetadataItem of tableNamesAndMetadata.data) {
            if (!tableNamesAndMetadataItem.tableNamesAndMetadata) continue;

            for (const tableMetadata of tableNamesAndMetadataItem.tableNamesAndMetadata) {
                if (!tableMetadata) continue;

                if (!newReducedTableNamesAndMetadata.sources.includes(tableMetadata.name)) {
                    newReducedTableNamesAndMetadata.sources.push(tableMetadata.name);
                }

                for (const categoricalColumnMetadata of tableMetadata.categorical_column_metadata) {
                    if (!newReducedTableNamesAndMetadata.categories[categoricalColumnMetadata.name]) {
                        newReducedTableNamesAndMetadata.categories[categoricalColumnMetadata.name] = [];
                    }

                    for (const value of categoricalColumnMetadata.unique_values) {
                        if (
                            !newReducedTableNamesAndMetadata.categories[categoricalColumnMetadata.name].includes(value)
                        ) {
                            newReducedTableNamesAndMetadata.categories[categoricalColumnMetadata.name].push(value);
                        }
                    }
                }

                for (const numericalColumnName of tableMetadata.numerical_column_names) {
                    const match = fluidZoneRegExp.exec(numericalColumnName);
                    if (match) {
                        const fluidZone = match.groups?.fluidZone;
                        if (fluidZone && !newReducedTableNamesAndMetadata.fluidZones.includes(fluidZone)) {
                            newReducedTableNamesAndMetadata.fluidZones.push(fluidZone);
                        }
                    }
                }
            }
        }

        setReducedTableNamesAndMetadata(newReducedTableNamesAndMetadata);
    }

    return reducedTableNamesAndMetadata;
}
