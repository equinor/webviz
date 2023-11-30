import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { CircularProgress } from "@lib/components/CircularProgress";
import { TableHeading } from "@lib/components/Table/table";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";

import { Channels } from "./channelDefs";
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

    props.moduleContext.usePublish({
        dependencies: [tableData.data, tableData.isFetching],
        channelIdent: Channels.ResponseValuePerRealization,
        contents: responseNames.map((el) => ({ ident: el, name: el })),
        dataGenerator: (contentIdent: string) => {
            const data = tableData.data?.find((el) => el.responseName === contentIdent);
            if (data && data.responses) {
                return data.responses.realizations.map((el, index) => ({
                    key: el,
                    value: data.responses?.values[index] ?? 0,
                }));
            }
            return [];
        },
    });

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

    const rows: Record<keyof typeof headings, string | number>[] = [];

    for (const responseData of tableData.data ?? []) {
        const ensemble = responseData.ensembleIdent?.toString() ?? "";
        const table = responseData.tableName ?? "";
        const responseName = responseData.responseName ?? "";

        if (responseData.responses) {
            for (let i = 0; i < responseData.responses.values.length; i++) {
                const response = responseData.responses.values[i];
                const realization = responseData.responses.realizations[i];

                const row = rows.find(
                    (el) => el.ensemble === ensemble && el.table === table && el.realization === realization
                );
                if (row) {
                    row[responseName] = response;
                } else {
                    rows.push({
                        ensemble,
                        table,
                        realization,
                        [responseName]: response,
                    });
                }
            }
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
                        {rows.map((row, index) => (
                            <tr key={index}>
                                {Object.entries(row).map(([key, value]) => (
                                    <td key={key}>{value}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};
