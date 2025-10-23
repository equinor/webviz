import { useMemo } from "react";

import { useAtomValue } from "jotai";
import type { Shape } from "plotly.js";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { PlotItem } from "@modules/_shared/components/VirtualizedPlotlyFigure";
import type { Interfaces } from "@modules/InplaceVolumesNew/interfaces";
import { PlotType, plotTypeToStringMapping } from "@modules/InplaceVolumesNew/typesAndEnums";

import {
    colorByAtom,
    plotTypeAtom,
    secondResultNameAtom,
    firstResultNameAtom,
    selectorColumnAtom,
    subplotByAtom,
} from "../atoms/baseAtoms";
import { useInplaceVolumesTable } from "../hooks/useInplaceVolumesTable";
import {
    createLegendPlot,
    makeAxisOptions,
    makeFormatLabelFunction,
    makePlotData,
    createHighlightShape,
} from "../utils/plotComponentUtils";
import { allValuesEqual, calculateGlobalRanges } from "../utils/plotDataCalculations";

export function useBuildVirtualizedPlotItems(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    hoveredRegion: string | null,
    hoveredZone: string | null,
    hoveredFacies: string | null,
): PlotItem[] {
    const inplaceVolumesTable = useInplaceVolumesTable();
    const plotType = useAtomValue(plotTypeAtom);
    const firstResultName = useAtomValue(firstResultNameAtom);
    const secondResultName = useAtomValue(secondResultNameAtom);
    const selectorColumn = useAtomValue(selectorColumnAtom);
    const subplotBy = useAtomValue(subplotByAtom);
    const colorBy = useAtomValue(colorByAtom);
    const plotOptions = viewContext.useSettingsToViewInterfaceValue("plotOptions");
    // State maps for plot generation
    const keyToColor = new Map<string, string>();
    const boxPlotKeyToPositionMap = new Map<string, number>();
    const plotItems = useMemo<PlotItem[]>(() => {
        if (!inplaceVolumesTable || !subplotBy || subplotBy.length === 0) {
            return [];
        }

        // Highlighted keys for hover effects
        const highlightedKeys = new Set<string>();
        if (hoveredRegion) highlightedKeys.add(hoveredRegion);
        if (hoveredZone) highlightedKeys.add(hoveredZone);
        if (hoveredFacies) highlightedKeys.add(hoveredFacies);

        // Set title
        let title = `${plotTypeToStringMapping[plotType]} plot`;
        if (firstResultName) {
            title += ` for ${firstResultName}`;
        }
        viewContext.setInstanceTitle(title);

        // Second axis name based on plot type
        let resultNameOrSelectorName: string | null = null;
        if (plotType === PlotType.BAR && selectorColumn) {
            resultNameOrSelectorName = selectorColumn.toString();
        }
        if (plotType !== PlotType.BAR && secondResultName) {
            resultNameOrSelectorName = secondResultName.toString();
        }

        const formatLabelFunction = makeFormatLabelFunction(ensembleSet);
        const { xAxisOptions, yAxisOptions } = makeAxisOptions(plotType, firstResultName, resultNameOrSelectorName);

        const items: PlotItem[] = [];

        // Group by all subplot columns
        const groupedEntries = inplaceVolumesTable.splitByColumns(subplotBy);

        // Calculate global ranges if shared axes are enabled
        // When active, all traces are calculated upfront
        let globalXRange: [number, number] | undefined;
        let globalYRange: [number, number] | undefined;
        let preCalculatedTraces: Map<string, Partial<Plotly.PlotData>[]> | undefined;

        if (plotOptions.sharedXAxis || plotOptions.sharedYAxis) {
            const plotDataFunction = makePlotData(
                plotType,
                firstResultName ?? "",
                resultNameOrSelectorName ?? "",
                colorBy,
                ensembleSet,
                colorSet,
                plotOptions,
                keyToColor,
                boxPlotKeyToPositionMap,
            );

            // Calculate traces for all groups upfront
            const allTraces = groupedEntries.map((entry) => plotDataFunction(entry.table));

            // Calculate global ranges
            const ranges = calculateGlobalRanges(allTraces);
            globalXRange = ranges.xRange;
            globalYRange = ranges.yRange;

            // Store pre-calculated traces to avoid recalculating
            preCalculatedTraces = new Map();
            groupedEntries.forEach((entry, index) => {
                preCalculatedTraces!.set(entry.key, allTraces[index]);
            });
        }

        // Build axis overrides for shared axes
        const xAxisOverrides: Partial<Plotly.LayoutAxis> = {
            tickangle: 35,
            ...(plotOptions.sharedXAxis && globalXRange ? { range: globalXRange } : { autorange: true }),
        };

        const yAxisOverrides: Partial<Plotly.LayoutAxis> = {
            ...(plotOptions.sharedYAxis && globalYRange ? { range: globalYRange } : { autorange: true }),
        };

        // Track first traces for legend
        let firstTraces: Partial<Plotly.PlotData>[] | null = null;

        // Build plot items for each group
        for (const entry of groupedEntries) {
            // Skip this subplot if hideConstants is enabled and all values are constant
            if (plotOptions.hideConstants) {
                const resultValues = entry.table.getColumn(firstResultName ?? "");
                if (resultValues) {
                    const numericValues = resultValues.filter((v): v is number => typeof v === "number" && !isNaN(v));

                    if (numericValues.length > 0 && allValuesEqual(numericValues)) {
                        continue;
                    }
                }
            }

            // Build label from key parts
            const labelParts = subplotBy.map((colName, idx) =>
                formatLabelFunction(colName, entry.keyParts[idx]?.toString() ?? entry.key),
            );
            const label = labelParts.join(" - ");

            // Check if this subplot should be highlighted
            const isHighlighted = entry.keyParts.some((part) => highlightedKeys.has(part?.toString() ?? ""));
            const shapes: Partial<Shape>[] = isHighlighted ? [createHighlightShape()] : [];

            // Build layout
            const plotLayout = {
                title: {
                    text: label,
                    font: { size: 12 },
                },
                barmode: plotOptions.histogramType,
                xaxis: { ...xAxisOptions, ...xAxisOverrides },
                yaxis: { ...yAxisOptions, ...yAxisOverrides },
                showlegend: false,
                margin: { t: 30, b: 50, l: 50, r: 20 },
                shapes: shapes.length > 0 ? shapes : undefined,
            };

            // Build plot item - either with pre-calculated data or lazy loading
            // If pre-calculated we return full data, else we return a getData function
            const plotItem: PlotItem = preCalculatedTraces
                ? {
                      // Shared axes: use pre-calculated traces
                      id: entry.key,
                      data: preCalculatedTraces.get(entry.key),
                      layout: plotLayout,
                      config: { displayModeBar: false },
                      placeholderLabel: label,
                  }
                : {
                      // Independent axes: lazy load traces
                      id: entry.key,
                      getData: () => {
                          const plotDataFunction = makePlotData(
                              plotType,
                              firstResultName ?? "",
                              resultNameOrSelectorName ?? "",
                              colorBy,
                              ensembleSet,
                              colorSet,
                              plotOptions,
                              keyToColor,
                              boxPlotKeyToPositionMap,
                          );
                          return plotDataFunction(entry.table);
                      },
                      layout: plotLayout,
                      config: { displayModeBar: false },
                      placeholderLabel: label,
                  };

            items.push(plotItem);

            // Capture first traces for legend (only calculate once)
            if (firstTraces === null) {
                if (preCalculatedTraces) {
                    firstTraces = preCalculatedTraces.get(entry.key) || null;
                } else {
                    const plotDataFunction = makePlotData(
                        plotType,
                        firstResultName ?? "",
                        resultNameOrSelectorName ?? "",
                        colorBy,
                        ensembleSet,
                        colorSet,
                        plotOptions,
                        keyToColor,
                        boxPlotKeyToPositionMap,
                    );
                    firstTraces = plotDataFunction(entry.table);
                }
            }
        }

        // Add legend plot
        if (firstTraces) {
            items.push(createLegendPlot(firstTraces));
        }

        return items;
    }, [
        inplaceVolumesTable,
        plotType,
        firstResultName,
        secondResultName,
        selectorColumn,
        subplotBy,
        colorBy,
        ensembleSet,
        colorSet,
        viewContext,
        hoveredZone,
        hoveredRegion,
        hoveredFacies,
        plotOptions,
        keyToColor,
        boxPlotKeyToPositionMap,
    ]);

    return plotItems;
}
