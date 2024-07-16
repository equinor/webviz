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
import { PlotBuilder } from "@modules/_shared/InplaceVolumetrics/PlotBuilder";
import { Table } from "@modules/_shared/InplaceVolumetrics/Table";
import {
    EnsembleIdentWithRealizations,
    useGetAggregatedTableDataQueries,
} from "@modules/_shared/InplaceVolumetrics/queryHooks";
import { makeTableFromApiData } from "@modules/_shared/InplaceVolumetrics/tableUtils";
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
        [InplaceVolumetricsIdentifier_api.ZONE], //subplotBy?.subplotBy === SubplotBy.IDENTIFIER ? [subplotBy.identifier] : [],
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

    let plots: React.ReactNode | null = null;

    if (aggregatedTableDataQueries.tablesData.length > 0) {
        const table = makeTableFromApiData(aggregatedTableDataQueries.tablesData);

        let title = `Convergence plot of mean/p10/p90`;
        if (resultName) {
            title += ` for ${resultName}`;
        }
        props.viewContext.setInstanceTitle(title);

        const plotbuilder = new PlotBuilder(table, makePlotData(resultName ?? ""));

        plotbuilder.setSubplotByColumn("ZONE");
        plots = plotbuilder.build(divBoundingRect.height, divBoundingRect.width, {
            horizontalSpacing: 0.075,
            verticalSpacing: 0.075,
            showGrid: true,
            margin: { t: 50, b: 20, l: 50, r: 20 },
        });
    }

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
                    { hidden: plots !== undefined }
                )}
            >
                {makeMessage()}
            </div>
            {plots}
        </div>
    );
}

function makePlotData(resultName: string): (table: Table) => Partial<PlotData>[] {
    return (table: Table): Partial<PlotData>[] => {
        const data: Partial<PlotData>[] = [];

        const realizationAndResultArray: RealizationAndResult[] = [];
        const reals = table.getColumn("REAL");
        const results = table.getColumn(resultName);
        if (!reals) {
            throw new Error("REAL column not found");
        }
        if (!results) {
            throw new Error(`Column not found: ${resultName}`);
        }
        for (let i = 0; i < reals.getNumRows(); i++) {
            realizationAndResultArray.push({
                realization: reals.getRowValue(i) as number,
                resultValue: results.getRowValue(i) as number,
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

        return data;
    };
}
