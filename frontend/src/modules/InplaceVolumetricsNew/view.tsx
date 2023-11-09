import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Table } from "@lib/components/Table";
import { TableHeading } from "@lib/components/Table/table";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";

import { useRealizationsResponses } from "./hooks/useRealizationResponses";
import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const responseNames = props.moduleContext.useStoreValue("selectedResponseNames");
    const tableNames = props.moduleContext.useStoreValue("selectedTableNames");
    const ensembleIdents = props.moduleContext.useStoreValue("selectedEnsembleIdents");
    const categoricalMetadata = props.moduleContext.useStoreValue("selectedCategoricalMetadata");
    const ref = React.useRef<HTMLDivElement>(null);

    const statusWriter = useViewStatusWriter(props.moduleContext);

    const size = useElementSize(ref);

    const tableData = useRealizationsResponses(ensembleIdents, tableNames, responseNames, {
        categorical_filter: categoricalMetadata,
    });

    statusWriter.setLoading(tableData.isFetching);

    const headings: TableHeading = {
        ensemble: {
            label: "Ensemble",
            sizeInPercent: 10,
        },
        table: {
            label: "Table",
            sizeInPercent: 10,
        },
        realization: {
            label: "Realization",
            sizeInPercent: 10,
        },
    };

    for (const responseName of responseNames) {
        headings[responseName] = {
            label: responseName,
            sizeInPercent: 10,
        };
    }

    const realizationValues: string[] = [];
    const responseValues: Record<keyof typeof headings, (string | number)[]> = {};

    const rows: Record<keyof typeof headings, string | number>[] = [];

    for (const response of tableData.data ?? []) {
        const ensemble = response.ensembleIdent?.toString() ?? "";
        const table = response.tableName ?? "";
        const responseName = response.responseName ?? "";

        if (response.responses) {
            for (const realization of response.responses.realizations) {
                const row: Record<keyof typeof headings, string | number> = Object.values().find((el) => el.ensemble === ensemble && el.table === table && el.realization === realization) ?? {
                const row: Record<keyof typeof headings, string | number> = {
                    ensemble,
                    table,
                    realization,

            }
        }

        if (!realizationValues.includes(realization)) {
            realizationValues.push(realization);
        }

        if (!responseValues[responseName]) {
            responseValues[responseName] = [];
        }

        if (!responseValues[responseName].includes(response.value)) {
            responseValues[responseName].push(response.value);
        }
    }

    return (
        <div ref={ref} className="flex flex-col w-full h-full">
            {tableData.isFetching ? (
                <ContentInfo>
                    <CircularProgress />
                </ContentInfo>
            ) : (
                <table className="w-full h-full">
                    <thead>
                        <tr>
                            {Object.entries(headings).map(([key, value]) => (
                                <th key={key} className="text-left">
                                    {value.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {

                        }
                    </tbody>
                </table>
            )}
        </div>
    );
};
