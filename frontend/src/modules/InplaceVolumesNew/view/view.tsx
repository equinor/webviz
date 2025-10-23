import React from "react";

import { useAtomValue } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Table } from "@lib/components/Table";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { Plot } from "@modules/_shared/components/Plot";
import { VirtualizedPlotlyFigure } from "@modules/_shared/components/VirtualizedPlotlyFigure";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import { areSelectedTablesComparableAtom } from "./atoms/derivedAtoms";
import { aggregatedTableDataQueriesAtom } from "./atoms/queryAtoms";
import { useBuildStatisticalTable } from "./hooks/useBuildStatisticalTable";
import { useBuildVirtualizedPlotItems } from "./hooks/useBuildVirtualizedPlotItems";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";

const LEGEND_HEIGHT = 80; // Fixed height for the legend area in pixels

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const colorSet = useColorSet(props.workbenchSettings);

    const hoveredRegion = useSubscribedValue("global.hoverRegion", props.workbenchServices);
    const hoveredZone = useSubscribedValue("global.hoverZone", props.workbenchServices);
    const hoveredFacies = useSubscribedValue("global.hoverFacies", props.workbenchServices);
    const plotOptions = props.viewContext.useSettingsToViewInterfaceValue("plotOptions");
    const divRef = React.useRef<HTMLDivElement>(null);
    const divBoundingRect = useElementBoundingRect(divRef);

    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);

    const plotType = props.viewContext.useSettingsToViewInterfaceValue("plotType");
    statusWriter.setLoading(aggregatedTableDataQueries.isFetching);
    useMakeViewStatusWriterMessages(statusWriter);

    const plotItems = useBuildVirtualizedPlotItems(
        props.viewContext,
        ensembleSet,
        colorSet,
        hoveredRegion?.regionName ?? null,
        hoveredZone?.zoneName ?? null,
        hoveredFacies?.faciesName ?? null,
    );

    // Debounce the height to prevent rapid re-renders during resize
    const stableHeight = useDebouncedValue(divBoundingRect.height);

    // Separate the legend plot from the data plots
    const legendPlot = plotItems.find((item) => item.id === "legend-plot");
    const dataPlots = plotItems.filter((item) => item.id !== "legend-plot");
    const plotsHeight = legendPlot && plotOptions.showLegend ? Math.max(0, stableHeight - LEGEND_HEIGHT) : stableHeight;
    const { columns, rows } = useBuildStatisticalTable(props.viewContext, ensembleSet);

    usePublishToDataChannels(props.viewContext, ensembleSet, colorSet);

    function createErrorMessage(): string | null {
        if (aggregatedTableDataQueries.allQueriesFailed) {
            return "Failed to load inplace volumes table data";
        }
        if (!areSelectedTablesComparable) {
            return "Selected inplace volumes tables are not comparable due to mismatching fluids, result names or index columns";
        }

        return null;
    }

    // If a user selects a single table first and initiates a fetch but then selects a set of tables that are not comparable,
    // we don't want to show that the module is pending, but rather immediately show the error message that the tables are not comparable.
    // The query is still fetching, but we don't want to show the pending state.
    const isPending = aggregatedTableDataQueries.isFetching && areSelectedTablesComparable;

    return (
        <div ref={divRef} className="w-full h-full relative flex flex-col">
            <PendingWrapper isPending={isPending} errorMessage={createErrorMessage() ?? undefined}>
                {plotType === PlotType.STATISTICAL_TABLE ? (
                    <Table columns={columns} rows={rows} />
                ) : plotItems.length > 0 ? (
                    <>
                        {/* Main plots area - scrollable */}
                        <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
                            {plotsHeight > 0 && (
                                <VirtualizedPlotlyFigure
                                    plotItems={dataPlots}
                                    width={divBoundingRect.width}
                                    height={plotsHeight}
                                    minPlotSize={300}
                                    fixedPlotHeight={350}
                                />
                            )}
                        </div>
                        {/* Fixed legend at the bottom */}
                        {legendPlot && legendPlot.data && plotOptions.showLegend && (
                            <div
                                style={{
                                    height: LEGEND_HEIGHT,
                                    width: divBoundingRect.width,
                                    borderTop: "1px solid #ddd",
                                    backgroundColor: "white",
                                }}
                            >
                                <Plot
                                    data={legendPlot.data}
                                    layout={{
                                        ...legendPlot.layout,
                                        width: divBoundingRect.width,
                                        height: LEGEND_HEIGHT,
                                    }}
                                    config={legendPlot.config}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ height: divBoundingRect.height }} />
                )}
            </PendingWrapper>
        </div>
    );
}
