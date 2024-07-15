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
import { makeSubplots } from "@modules/_shared/Figure";
import { InplaceVolumetricsTablesDataAccessor } from "@modules/_shared/InplaceVolumetrics/InplaceVolumetricsDataAccessor";
import {
    EnsembleIdentWithRealizations,
    useGetAggregatedTableDataQueries,
} from "@modules/_shared/InplaceVolumetrics/queryHooks";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { Layout, PlotData } from "plotly.js";

import { InplaceVolumetricsPlotBuilder, TableData } from "./plotBuilder";
import { SubplotBy } from "./types";

import { RealizationAndResult, calcConvergenceArray } from "../settings/utils/convergenceCalculation";
import { SettingsToViewInterface } from "../settingsToViewInterface";

export function View(props: ModuleViewProps<Record<string, never>, SettingsToViewInterface>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleRealizationFilter = useEnsembleRealizationFilterFunc(props.workbenchSession);
    const colorSet = props.workbenchSettings.useColorSet();

    const filter = props.viewContext.useSettingsToViewInterfaceValue("filter");
    const resultName = props.viewContext.useSettingsToViewInterfaceValue("resultName");
    const subplotBy = props.viewContext.useSettingsToViewInterfaceValue("subplotBy");
    const colorBy = props.viewContext.useSettingsToViewInterfaceValue("colorBy");

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

    let title = `Convergence plot of mean/p10/p90`;
    if (resultName) {
        title += ` for ${resultName}`;
    }
    if (subplotBy.subplotBy !== SubplotBy.ENSEMBLE && tablesDataAccessor.getTables().length === 1) {
        const subTable = tablesDataAccessor.getTables()[0];
        title += ` - ${makeDistinguishableEnsembleDisplayName(
            subTable.getEnsembleIdent(),
            ensembleSet.getEnsembleArr()
        )} - ${subTable.getTableName()}`;
    }
    props.viewContext.setInstanceTitle(title);

    const plotbuilder = new InplaceVolumetricsPlotBuilder(tablesDataAccessor, ensembleSet, colorSet);

    plotbuilder.setSubplotBy(subplotBy);
    plotbuilder.setPlottingFunction(makePlotData(resultName ?? ""));
    const figure = plotbuilder.build(divBoundingRect.height, divBoundingRect.width);

    const plotComponent = figure?.makePlot();

    /*
    const subplots: { title?: string; plotData: Partial<PlotData>[] }[] = [];
    let plotComponent: React.ReactNode = null;

    if (tablesDataAccessor.getTables().length > 0) {
        if (subplotBy.subplotBy === SubplotBy.NONE) {
            // Expecting 1 table
            if (tablesDataAccessor.getTables().length !== 1) {
                throw new Error("Expected exactly 1 table when subplotBy is NONE");
            }
            const realizationAndResultArray: RealizationAndResult[] = [];
            for (const row of tablesDataAccessor.getTables()[0].getRows()) {
                realizationAndResultArray.push({
                    realization: row["REAL"] as number,
                    resultValue: row[resultName ?? ""] as number,
                });
            }

            const data = makePlotData(realizationAndResultArray);
            subplots.push({ plotData: data });
        } else if (subplotBy.subplotBy === SubplotBy.IDENTIFIER) {
            // Expecting 1 table
            if (tablesDataAccessor.getTables().length !== 1) {
                throw new Error("Expected exactly 1 table when subplotBy is any identifier");
            }
            const subTable = tablesDataAccessor.getTables()[0];
            const uniqueColumnValues = subTable.getUniqueColumnValues(subplotBy.identifier);

            for (let i = 0; i < uniqueColumnValues.length; i++) {
                const realizationAndResultArray: RealizationAndResult[] = [];
                for (const row of subTable.getRowsWithFilter(subplotBy.identifier, uniqueColumnValues[i])) {
                    realizationAndResultArray.push({
                        realization: row["REAL"] as number,
                        resultValue: row[resultName ?? ""] as number,
                    });
                }

                const data = makePlotData(realizationAndResultArray);
                subplots.push({ title: uniqueColumnValues[i].toString(), plotData: data });
            }
        } else if (subplotBy.subplotBy === SubplotBy.FLUID_ZONE) {
            for (const subTable of tablesDataAccessor.getTables()) {
                const realizationAndResultArray: RealizationAndResult[] = [];
                for (const row of subTable.getRows()) {
                    realizationAndResultArray.push({
                        realization: row["REAL"] as number,
                        resultValue: row[resultName ?? ""] as number,
                    });
                }

                const data = makePlotData(realizationAndResultArray);
                subplots.push({ title: subTable.getFluidZone(), plotData: data });
            }
        } else if (subplotBy.subplotBy === SubplotBy.SOURCE) {
            for (const subTable of tablesDataAccessor.getTables()) {
                const realizationAndResultArray: RealizationAndResult[] = [];
                for (const row of subTable.getRows()) {
                    realizationAndResultArray.push({
                        realization: row["REAL"] as number,
                        resultValue: row[resultName ?? ""] as number,
                    });
                }

                const data = makePlotData(realizationAndResultArray);
                subplots.push({
                    title: `${makeDistinguishableEnsembleDisplayName(
                        subTable.getEnsembleIdent(),
                        ensembleSet.getEnsembleArr()
                    )} - ${subTable.getTableName()}`,
                    plotData: data,
                });
            }
        }
    }

    if (subplots.length > 0) {
        const numRows = Math.ceil(Math.sqrt(subplots.length));
        const numCols = Math.ceil(subplots.length / numRows);

        const traces: { row: number; col: number; trace: Partial<PlotData> }[] = [];
        const subplotTitles: string[] = [];
        for (let row = 1; row <= numRows; row++) {
            for (let col = 1; col <= numCols; col++) {
                const index = (row - 1) * numCols + (col - 1);

                const adjustedIndex = (numRows - 1 - (row - 1)) * numCols + (col - 1);
                subplotTitles.push(subplots[adjustedIndex]?.title ?? "");

                if (index >= subplots.length) {
                    continue;
                }

                for (const trace of subplots[index].plotData) {
                    if (row !== 1 || col !== 1) {
                        trace.showlegend = false;
                    }
                    traces.push({ trace, row: numRows - (row - 1), col });
                }
            }
        }

        const figure = makeSubplots({
            height: divBoundingRect.height,
            width: divBoundingRect.width,
            numRows,
            numCols,
            horizontalSpacing: 0.075,
            verticalSpacing: 0.075,
            showGrid: true,
            margin: { t: 50, b: 20, l: 50, r: 20 },
            subplotTitles,
        });

        for (const { trace, row, col } of traces) {
            figure.addTrace(trace, row, col);
        }

        plotComponent = figure.makePlot();
    }
    */

    function makeMessage(): React.ReactNode {
        if (aggregatedTableDataQueries.isFetching) {
            return <CircularProgress size="medium" />;
        }

        if (aggregatedTableDataQueries.allQueriesFailed) {
            return "Failed to load data.";
        }

        return "No data to display.";
    }

    return (
        <div ref={divRef} className="w-full h-full relative">
            <div
                className={resolveClassNames(
                    "absolute top-0 left-0 w-full h-full bg-white bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-10",
                    { hidden: plotComponent !== undefined }
                )}
            >
                {makeMessage()}
            </div>
            {plotComponent}
        </div>
    );
}

function makePlotData(resultName: string): (tableData: TableData[]) => Partial<PlotData>[] {
    return (tableData: TableData[]): Partial<PlotData>[] => {
        const data: Partial<PlotData>[] = [];

        for (const table of tableData) {
            const realizationAndResultArray: RealizationAndResult[] = [];
            const reals = table.columns["realization"];
            const results = table.columns[resultName];
            for (let i = 0; i < reals.length; i++) {
                realizationAndResultArray.push({
                    realization: reals[i] as number,
                    resultValue: results[i] as number,
                });
            }

            const convergenceArr = calcConvergenceArray(realizationAndResultArray);

            data.push(
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
                        dash: "dashdot",
                    },
                }
            );
        }

        return data;
    };
}
