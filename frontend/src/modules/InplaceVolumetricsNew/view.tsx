import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { Table } from "@lib/components/Table";
import { TableHeading } from "@lib/components/Table/table";
import { useElementSize } from "@lib/hooks/useElementSize";

import { useRealizationsResponses } from "./hooks/useRealizationResponses";
import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const responseNames = props.moduleContext.useStoreValue("selectedResponseNames");
    const tableNames = props.moduleContext.useStoreValue("selectedTableNames");
    const ensembleIdents = props.moduleContext.useStoreValue("selectedEnsembleIdents");
    const categoricalMetadata = props.moduleContext.useStoreValue("selectedCategoricalMetadata");
    const ref = React.useRef<HTMLDivElement>(null);
    const size = useElementSize(ref);

    const tableData = useRealizationsResponses(ensembleIdents, tableNames, responseNames, {
        categorical_filter: categoricalMetadata,
    });

    const headings: TableHeading = {
        ensemble: {
            label: "Ensemble",
            sizeInPercent: 10,
        },
        source: {
            label: "Source",
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

    const data: Record<keyof typeof headings, string | number>[] = [];

    const responsesData = tableData.data.reduce((acc, table) => {
        if (table.responses) {
            const ensemble = table.ensembleIdent.toString();
            const source = table.tableName;
            const responseName = table.responseName;

            for (let i = 0; i < table.responses.realizations.length; i++) {
                const realization = table.responses.realizations[i];

                const existingItem = acc.find(
                    (item) => item.ensemble === ensemble && item.source === source && item.realization === realization
                );

                if (!existingItem) {
                    acc.push({
                        ensemble,
                        source,
                        realization,
                        responses: [
                            {
                                responseName,
                                value: table.responses.values[i],
                            },
                        ],
                    });
                } else {
                    existingItem.responses.push({
                        responseName,
                        value: table.responses.values[i],
                    });
                }
            }
        }

        return acc;
    }, [] as { ensemble: string; source: string; realization: number; responses: { responseName: string; value: number }[] }[]);

    for (const item of responsesData) {
        const row: Record<keyof typeof headings, string | number> = {
            ensemble: item.ensemble,
            source: item.source,
            realization: item.realization,
        };

        for (const response of item.responses) {
            if (responseNames.includes(response.responseName.replace("_GAS", "").replace("_OIL", ""))) {
                row[response.responseName] = response.value;
            }
        }

        data.push(row);
    }

    return (
        <div ref={ref} className="flex flex-col w-full h-full">
            <Table headings={headings} data={data} />
        </div>
    );
};
