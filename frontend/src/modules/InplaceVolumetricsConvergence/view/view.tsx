import React from "react";
import Plot from "react-plotly.js";

import { InplaceVolumetricsIdentifier_api } from "@api";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { InplaceVolumetricsTablesDataAccessor } from "@modules/_shared/InplaceVolumetrics/InplaceVolumetricsDataAccessor";
import {
    EnsembleIdentWithRealizations,
    useGetAggregatedTableDataQueries,
} from "@modules/_shared/InplaceVolumetrics/queryHooks";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { Layout, PlotData } from "plotly.js";

import { RealizationAndResult, calcConvergenceArray } from "../settings/utils/convergenceCalculation";
import { SettingsToViewInterface } from "../settingsToViewInterface";
import { SubplotBy } from "../typesAndEnums";

export function View(props: ModuleViewProps<Record<string, never>, SettingsToViewInterface>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleRealizationFilter = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const filter = props.viewContext.useSettingsToViewInterfaceValue("filter");
    const resultName = props.viewContext.useSettingsToViewInterfaceValue("resultName");
    const subplotBy = props.viewContext.useSettingsToViewInterfaceValue("subplotBy");

    const divRef = React.useRef<HTMLDivElement>(null);
    const divBoundingRect = useElementBoundingRect(divRef);

    const ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[] = [];
    for (const ensembleIdent of filter.ensembleIdents) {
        ensembleIdentsWithRealizations.push({
            ensembleIdent,
            realizations: ensembleRealizationFilter(ensembleIdent),
        });
    }

    const aggregatedTableDataQueries = useGetAggregatedTableDataQueries(
        ensembleIdentsWithRealizations,
        filter.tableNames,
        resultName ? [resultName] : [],
        filter.fluidZones,
        subplotBy?.subplotBy === SubplotBy.IDENTIFIER ? [subplotBy.identifier] : [],
        subplotBy?.subplotBy !== SubplotBy.FLUID_ZONE,
        false,
        filter.identifiersValues
    );

    statusWriter.setLoading(aggregatedTableDataQueries.isFetching);

    if (aggregatedTableDataQueries.someQueriesFailed) {
        for (const error of aggregatedTableDataQueries.errors) {
            const helper = ApiErrorHelper.fromError(error);
            if (helper) {
                statusWriter.addError(helper.makeStatusMessage());
            }
        }
    }

    const tablesDataAccessor = new InplaceVolumetricsTablesDataAccessor(aggregatedTableDataQueries.tablesData);

    let plotComponents: React.ReactNode[] = [];
    if (tablesDataAccessor.getTables().length === 1) {
        if (subplotBy?.subplotBy !== SubplotBy.IDENTIFIER) {
            const realizationAndResultArray: RealizationAndResult[] = [];
            for (const row of tablesDataAccessor.getTables()[0].getRows()) {
                realizationAndResultArray.push({
                    realization: row["REAL"] as number,
                    result: row[resultName ?? ""] as number,
                });
            }

            plotComponents.push(
                makePlot(resultName ?? "", divBoundingRect.width, divBoundingRect.height, realizationAndResultArray)
            );
        } else {
            const subTable = tablesDataAccessor.getTables()[0];
            const uniqueColumnValues = subTable.getUniqueColumnValues(subplotBy.identifier);
            for (const uniqueColumnValue of uniqueColumnValues) {
                const realizationAndResultArray: RealizationAndResult[] = [];
                for (const row of subTable.getRowsWithFilter(subplotBy.identifier, uniqueColumnValue)) {
                    realizationAndResultArray.push({
                        realization: row["REAL"] as number,
                        result: row[resultName ?? ""] as number,
                    });
                }

                plotComponents.push(
                    makePlot(
                        `${resultName ?? ""} for ${uniqueColumnValue}`,
                        divBoundingRect.width,
                        divBoundingRect.height / uniqueColumnValues.length,
                        realizationAndResultArray
                    )
                );
            }
        }
    } else if (tablesDataAccessor.getTables().length > 1) {
        for (const subTable of tablesDataAccessor.getTables()) {
            const realizationAndResultArray: RealizationAndResult[] = [];
            for (const row of subTable.getRows()) {
                realizationAndResultArray.push({
                    realization: row["REAL"] as number,
                    result: row[resultName ?? ""] as number,
                });
            }

            plotComponents.push(
                makePlot(
                    `${resultName ?? ""} for ${makeDistinguishableEnsembleDisplayName(
                        subTable.getEnsembleIdent(),
                        ensembleSet.getEnsembleArr()
                    )} - ${subTable.getTableName()} - ${subTable.getFluidZone()}`,
                    divBoundingRect.width,
                    divBoundingRect.height / tablesDataAccessor.getTables().length,
                    realizationAndResultArray
                )
            );
        }
    }

    return (
        <div ref={divRef} className="w-full h-full relative">
            <div
                className={resolveClassNames(
                    "absolute top-0 left-0 w-full h-full bg-white bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-10",
                    { hidden: plotComponents.length !== 0 }
                )}
            >
                {aggregatedTableDataQueries.isFetching ? <CircularProgress size="medium" /> : "Failed to load data."}
            </div>
            {plotComponents}
        </div>
    );
}

function makePlot(
    resultName: string,
    width: number,
    height: number,
    realizationAndResultArray: RealizationAndResult[]
): React.ReactNode {
    const layout: Partial<Layout> = {
        title: `Convergence plot of mean/p10/p90 for ${resultName}`,
        xaxis: {
            title: "REAL",
        },
        yaxis: {
            title: resultName ?? "",
        },
        height: height,
        width: width,
    };

    const convergenceArr = calcConvergenceArray(realizationAndResultArray);

    const data: Partial<PlotData>[] = [
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.mean),
            name: "Mean",
            type: "scatter",
            line: {
                color: "black",
                width: 1,
            },
        },
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.p10),
            name: "P10",
            type: "scatter",
            line: {
                color: "red",
                width: 1,
                dash: "dash",
            },
        },
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.p90),
            name: "P90",
            type: "scatter",
            line: {
                color: "blue",
                width: 1,
                dash: "dash",
            },
        },
    ];

    return <Plot data={data} layout={layout} />;
}
