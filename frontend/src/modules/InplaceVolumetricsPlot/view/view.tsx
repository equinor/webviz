import React from "react";

import { InplaceVolumetricResultName_api, InplaceVolumetricsIdentifier_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { ColorSet } from "@lib/utils/ColorSet";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { PlotBuilder } from "@modules/_shared/InplaceVolumetrics/PlotBuilder";
import { Table } from "@modules/_shared/InplaceVolumetrics/Table";
import {
    EnsembleIdentWithRealizations,
    useGetAggregatedPerRealizationTableDataQueries,
} from "@modules/_shared/InplaceVolumetrics/queryHooks";
import { makeTableFromApiData } from "@modules/_shared/InplaceVolumetrics/tableUtils";
import { SourceAndTableIdentifierUnion, SourceIdentifier } from "@modules/_shared/InplaceVolumetrics/types";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import {
    HistogramBinRange,
    makeHistogramBinRangesFromMinAndMaxValues,
    makeHistogramTrace,
} from "@modules/_shared/histogram";

import { formatRgb, parse } from "culori";
import { PlotData } from "plotly.js";

import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";

import { Interfaces } from "../interfaces";
import { RealizationAndResult, calcConvergenceArray } from "../settings/utils/convergenceCalculation";
import { PlotType, plotTypeToStringMapping } from "../typesAndEnums";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleRealizationFilter = useEnsembleRealizationFilterFunc(props.workbenchSession);
    const colorSet = props.workbenchSettings.useColorSet();

    const hoveredRegion = useSubscribedValue("global.hoverRegion", props.workbenchServices);
    const hoveredZone = useSubscribedValue("global.hoverZone", props.workbenchServices);
    const hoveredFacies = useSubscribedValue("global.hoverFacies", props.workbenchServices);

    const filter = props.viewContext.useSettingsToViewInterfaceValue("filter");
    const resultName = props.viewContext.useSettingsToViewInterfaceValue("resultName");
    const resultName2 = props.viewContext.useSettingsToViewInterfaceValue("resultName2");
    const subplotBy = props.viewContext.useSettingsToViewInterfaceValue("subplotBy");
    const colorBy = props.viewContext.useSettingsToViewInterfaceValue("colorBy");
    const plotType = props.viewContext.useSettingsToViewInterfaceValue("plotType");

    const divRef = React.useRef<HTMLDivElement>(null);
    const divBoundingRect = useElementBoundingRect(divRef);

    const ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[] = [];
    for (const ensembleIdent of filter.ensembleIdents) {
        ensembleIdentsWithRealizations.push({
            ensembleIdent,
            realizations: ensembleRealizationFilter(ensembleIdent),
        });
    }

    const accByIdentifiers: InplaceVolumetricsIdentifier_api[] = [];
    if (Object.values(InplaceVolumetricsIdentifier_api).includes(subplotBy as any)) {
        accByIdentifiers.push(subplotBy as InplaceVolumetricsIdentifier_api);
    }
    if (Object.values(InplaceVolumetricsIdentifier_api).includes(colorBy as any)) {
        accByIdentifiers.push(colorBy as InplaceVolumetricsIdentifier_api);
    }

    const resultNames: InplaceVolumetricResultName_api[] = [];
    if (resultName) {
        resultNames.push(resultName);
    }
    if (resultName2) {
        resultNames.push(resultName2);
    }

    const aggregatedTableDataQueries = useGetAggregatedPerRealizationTableDataQueries(
        ensembleIdentsWithRealizations,
        filter.tableNames,
        resultNames,
        filter.fluidZones,
        accByIdentifiers,
        subplotBy !== SourceIdentifier.FLUID_ZONE && colorBy !== SourceIdentifier.FLUID_ZONE,
        filter.identifiersValues,
        true
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
    let table: Table | undefined = undefined;
    if (aggregatedTableDataQueries.tablesData.length > 0) {
        table = makeTableFromApiData(aggregatedTableDataQueries.tablesData);

        let title = `${plotTypeToStringMapping[plotType]} plot of mean/p10/p90`;
        if (resultName) {
            title += ` for ${resultName}`;
        }
        props.viewContext.setInstanceTitle(title);

        const plotbuilder = new PlotBuilder(
            table,
            makePlotData(plotType, resultName ?? "", resultName2 ?? "", colorBy, ensembleSet, colorSet)
        );

        plotbuilder.setSubplotByColumn(subplotBy);
        plotbuilder.setFormatLabelFunction(makeFormatLabelFunction(ensembleSet));

        if (hoveredRegion) {
            plotbuilder.setHighlightedSubPlots([hoveredRegion.regionName]);
        }
        if (hoveredZone) {
            plotbuilder.setHighlightedSubPlots([hoveredZone.zoneName]);
        }
        if (hoveredFacies) {
            plotbuilder.setHighlightedSubPlots([hoveredFacies.faciesName]);
        }

        if (plotType === PlotType.SCATTER) {
            plotbuilder.setXAxisOptions({ title: { text: resultName ?? "", standoff: 20 } });
            plotbuilder.setYAxisOptions({ title: { text: resultName ?? "", standoff: 20 } });
        } else if (plotType === PlotType.CONVERGENCE) {
            plotbuilder.setXAxisOptions({ title: { text: "Realizations", standoff: 5 } });
            plotbuilder.setYAxisOptions({ title: { text: resultName ?? "", standoff: 5 } });
        }

        const horizontalSpacing = 80 / divBoundingRect.width;
        const verticalSpacing = 60 / divBoundingRect.height;

        plots = plotbuilder.build(divBoundingRect.height, divBoundingRect.width, {
            horizontalSpacing,
            verticalSpacing,
            showGrid: true,
            margin: plotType === PlotType.HISTOGRAM ? { t: 20, b: 50, l: 50, r: 20 } : { t: 20, b: 50, l: 50, r: 20 },
        });
    }

    usePublishToDataChannels(props.viewContext, ensembleSet, table, resultName ?? undefined);

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

function makeFormatLabelFunction(ensembleSet: EnsembleSet): (columnName: string, value: string | number) => string {
    return function formatLabel(columnName: string, value: string | number): string {
        if (columnName === SourceIdentifier.ENSEMBLE) {
            const ensembleIdent = EnsembleIdent.fromString(value.toString());
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (ensemble) {
                return makeDistinguishableEnsembleDisplayName(ensembleIdent, ensembleSet.getEnsembleArr());
            }
        }
        return value.toString();
    };
}

function makePlotData(
    plotType: PlotType,
    resultName: string,
    resultName2: string,
    colorBy: SourceAndTableIdentifierUnion,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet
): (table: Table) => Partial<PlotData>[] {
    return (table: Table): Partial<PlotData>[] => {
        let binRanges: HistogramBinRange[] = [];
        if (plotType === PlotType.HISTOGRAM) {
            const column = table.getColumn(resultName);
            if (!column) {
                return [];
            }
            const resultMinAndMax = column.reduce(
                (acc: { min: number; max: number }, value: string | number) => {
                    if (typeof value !== "number") {
                        return acc;
                    }
                    return {
                        min: Math.min(acc.min, value),
                        max: Math.max(acc.max, value),
                    };
                },
                { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
            );
            binRanges = makeHistogramBinRangesFromMinAndMaxValues({
                xMin: resultMinAndMax.min,
                xMax: resultMinAndMax.max,
                numBins: 20,
            });
        }

        const data: Partial<PlotData>[] = [];
        const collection = table.splitByColumn(colorBy);

        let color = colorSet.getFirstColor();
        for (const [key, table] of collection.getCollectionMap()) {
            let title = key.toString();
            if (colorBy === SourceIdentifier.ENSEMBLE) {
                const ensembleIdent = EnsembleIdent.fromString(key.toString());
                const ensemble = ensembleSet.findEnsemble(ensembleIdent);
                if (ensemble) {
                    color = ensemble.getColor();
                    title = makeDistinguishableEnsembleDisplayName(ensembleIdent, ensembleSet.getEnsembleArr());
                }
            }

            if (plotType === PlotType.HISTOGRAM) {
                data.push(...makeHistogram(title, table, resultName, color, binRanges));
            } else if (plotType === PlotType.CONVERGENCE) {
                data.push(...makeConvergencePlot(title, table, resultName, color));
            } else if (plotType === PlotType.DISTRIBUTION) {
                data.push(...makeDensityPlot(title, table, resultName, color));
            } else if (plotType === PlotType.BOX) {
                data.push(...makeBoxPlot(title, table, resultName, color));
            } else if (plotType === PlotType.SCATTER) {
                data.push(...makeScatterPlot(title, table, resultName, resultName2, color));
            } else if (plotType === PlotType.BAR) {
                data.push(...makeBarPlot(title, table, resultName, resultName2, color));
            }

            color = colorSet.getNextColor();
        }

        return data;
    };
}

function makeBarPlot(
    title: string,
    table: Table,
    resultName: string,
    resultName2: string,
    color: string
): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }
    const resultColumn2 = table.getColumn(resultName2);
    if (!resultColumn2) {
        return [];
    }

    data.push({
        x: resultColumn.getAllRowValues(),
        y: resultColumn2.getAllRowValues(),
        name: title,
        type: "bar",
        marker: {
            color,
        },
    });

    return data;
}

function makeConvergencePlot(title: string, table: Table, resultName: string, color: string): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const realizationAndResultArray: RealizationAndResult[] = [];
    const reals = table.getColumn("REAL");
    const results = table.getColumn(resultName);
    if (!reals) {
        throw new Error("REAL column not found");
    }
    if (!results) {
        return [];
    }
    for (let i = 0; i < reals.getNumRows(); i++) {
        realizationAndResultArray.push({
            realization: reals.getRowValue(i) as number,
            resultValue: results.getRowValue(i) as number,
        });
    }

    const convergenceArr = calcConvergenceArray(realizationAndResultArray);

    let lightColor = color;
    const rgbColor = parse(color);
    if (rgbColor) {
        rgbColor.alpha = 0.3;
        lightColor = formatRgb(rgbColor);
    }

    data.push(
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.p90),
            name: "P90",
            type: "scatter",
            legendgroup: title,
            legendgrouptitle: {
                text: title,
            },
            line: {
                color,
                width: 1,
                dash: "dashdot",
            },
            mode: "lines",
        },
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.mean),
            name: "Mean",
            legendgroup: title,
            legendgrouptitle: {
                text: title,
            },
            type: "scatter",
            line: {
                color,
                width: 1,
            },
            mode: "lines",
            fill: "tonexty",
            fillcolor: lightColor,
        },
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.p10),
            name: "P10",
            type: "scatter",
            legendgroup: title,
            legendgrouptitle: {
                text: title,
            },
            line: {
                color,
                width: 1,
                dash: "dash",
            },
            mode: "lines",
            fill: "tonexty",
            fillcolor: lightColor,
        }
    );

    return data;
}

function makeHistogram(
    title: string,
    table: Table,
    resultName: string,
    color: string,
    binRanges: HistogramBinRange[]
): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    const histogram = makeHistogramTrace({
        xValues: resultColumn.getAllRowValues() as number[],
        bins: binRanges,
        color,
    });

    histogram.name = title;
    histogram.showlegend = true;

    data.push(histogram);

    return data;
}

function makeDensityPlot(title: string, table: Table, resultName: string, color: string): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    const xValues = resultColumn.getAllRowValues().map((el) => parseFloat(el.toString()));

    data.push({
        x: xValues,
        name: title,
        type: "violin",
        marker: {
            color,
        },
        // @ts-ignore
        side: "positive",
        y0: 0,
        orientation: "h",
        spanmode: "hard",
        meanline: { visible: true },
        points: false,
        hoverinfo: "none",
    });

    return data;
}

function makeBoxPlot(title: string, table: Table, resultName: string, color: string): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    data.push({
        x: resultColumn.getAllRowValues(),
        name: title,
        type: "box",
        marker: {
            color,
        },
        // @ts-ignore
        y0: 0,
    });

    return data;
}

function makeScatterPlot(
    title: string,
    table: Table,
    resultName: string,
    resultName2: string,
    color: string
): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    const resultColumn2 = table.getColumn(resultName2);
    if (!resultColumn2) {
        return [];
    }

    data.push({
        x: resultColumn.getAllRowValues(),
        y: resultColumn2.getAllRowValues(),
        name: title,
        mode: "markers",
        marker: {
            color,
            size: 5,
        },
        type: "scatter",
    });

    return data;
}
