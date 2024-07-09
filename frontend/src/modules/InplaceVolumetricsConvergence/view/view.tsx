import React from "react";
import Plot from "react-plotly.js";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { InplaceVolumetricsTablesDataAccessor } from "@modules/_shared/InplaceVolumetrics/InplaceVolumetricsDataAccessor";
import {
    EnsembleIdentWithRealizations,
    useGetAggregatedTableDataQueries,
} from "@modules/_shared/InplaceVolumetrics/queryHooks";

import { Layout, PlotData } from "plotly.js";

import { RealizationAndResult, calcConvergenceArray } from "../settings/utils/convergenceCalculation";
import { SettingsToViewInterface } from "../settingsToViewInterface";

export function View(props: ModuleViewProps<Record<string, never>, SettingsToViewInterface>): React.ReactNode {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleRealizationFilter = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const filter = props.viewContext.useSettingsToViewInterfaceValue("filter");
    const resultName = props.viewContext.useSettingsToViewInterfaceValue("resultName");

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
        [],
        true,
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

    let plotComponent: React.ReactNode = null;
    if (tablesDataAccessor.getTables().length >= 1) {
        const layout: Partial<Layout> = {
            title: `Convergence plot of mean/p10/p90 for ${resultName}`,
            xaxis: {
                title: "REAL",
            },
            yaxis: {
                title: resultName ?? "",
            },
            height: divBoundingRect.height,
        };

        const realizationAndResultArray: RealizationAndResult[] = [];
        for (const row of tablesDataAccessor.getTables()[0].getRows()) {
            realizationAndResultArray.push({
                realization: row["REAL"] as number,
                result: row[resultName ?? ""] as number,
            });
        }

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

        plotComponent = <Plot data={data} layout={layout} className="w-full" />;
    }

    return (
        <div ref={divRef} className="w-full h-full relative">
            <div
                className={resolveClassNames(
                    "absolute top-0 left-0 w-full h-full bg-white bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-10",
                    { hidden: plotComponent !== null }
                )}
            >
                {aggregatedTableDataQueries.isFetching ? <CircularProgress size="medium" /> : "Failed to load data."}
            </div>
            {plotComponent}
        </div>
    );
}
