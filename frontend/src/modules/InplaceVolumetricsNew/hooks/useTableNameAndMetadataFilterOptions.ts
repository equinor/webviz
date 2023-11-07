import React from "react";

import { isEqual } from "lodash";

import { TableNamesAndMetaData } from "./useTableNamesAndMetadata";

export type TableNameAndMetadataFilterOptions = {
    tables: string[];
    fluidZones: string[];
    responses: { response: string; fluidZone: string }[];
    categories: Record<string, (string | number)[]>;
};

const fluidZoneRegExp = /^(?<response>\w+)_(?<fluidZone>\w+)$/;

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
            tables: [],
            fluidZones: [],
            responses: [],
            categories: {},
        };

        for (const tableNamesAndMetadataItem of tableNamesAndMetadata.data) {
            if (!tableNamesAndMetadataItem.tableNamesAndMetadata) continue;

            for (const tableMetadata of tableNamesAndMetadataItem.tableNamesAndMetadata) {
                if (!tableMetadata) continue;

                if (!newReducedTableNamesAndMetadata.tables.includes(tableMetadata.name)) {
                    newReducedTableNamesAndMetadata.tables.push(tableMetadata.name);
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

                        const response = match.groups?.response;
                        if (
                            response &&
                            fluidZone &&
                            !newReducedTableNamesAndMetadata.responses.find(
                                (el) => el.response === response && el.fluidZone === fluidZone
                            )
                        ) {
                            newReducedTableNamesAndMetadata.responses.push({
                                response,
                                fluidZone,
                            });
                        }
                    }
                }
            }
        }

        setReducedTableNamesAndMetadata(newReducedTableNamesAndMetadata);
    }

    return reducedTableNamesAndMetadata;
}
