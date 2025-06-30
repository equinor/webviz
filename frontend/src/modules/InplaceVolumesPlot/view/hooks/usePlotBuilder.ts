import type React from "react";

import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import type { ColorSet } from "@lib/utils/ColorSet";
import { PlotBuilder } from "@modules/_shared/InplaceVolumes/PlotBuilder";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { makeTableFromApiData } from "@modules/_shared/InplaceVolumes/tableUtils";
import type { Interfaces } from "@modules/InplaceVolumesPlot/interfaces";
import { PlotType, plotTypeToStringMapping } from "@modules/InplaceVolumesPlot/typesAndEnums";

import {
    colorByAtom,
    plotTypeAtom,
    secondResultNameAtom,
    firstResultNameAtom,
    selectorColumnAtom,
    subplotByAtom,
} from "../atoms/baseAtoms";
import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";
import { makeFormatLabelFunction, makePlotData } from "../utils/plotComponentUtils";

export function useBuildPlotAndTable(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    width: number,
    height: number,
    hoveredRegion: string | null,
    hoveredZone: string | null,
    hoveredFacies: string | null,
): { plots: React.ReactNode; table: Table } | null {
    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const plotType = useAtomValue(plotTypeAtom);
    const firstResultName = useAtomValue(firstResultNameAtom);
    const secondResultName = useAtomValue(secondResultNameAtom);
    const selectorColumn = useAtomValue(selectorColumnAtom);
    const subplotBy = useAtomValue(subplotByAtom);
    const colorBy = useAtomValue(colorByAtom);

    // Return null if there is no data to plot
    if (aggregatedTableDataQueries.tablesData.length === 0) {
        return null;
    }

    const table = makeTableFromApiData(aggregatedTableDataQueries.tablesData);

    let title = `${plotTypeToStringMapping[plotType]} plot of mean/p10/p90`;
    if (firstResultName) {
        title += ` for ${firstResultName}`;
    }
    viewContext.setInstanceTitle(title);

    let resultNameOrSelectorName: string | null = null;
    if (plotType === PlotType.BAR && selectorColumn) {
        resultNameOrSelectorName = selectorColumn.toString();
    }
    if (plotType !== PlotType.BAR && secondResultName) {
        resultNameOrSelectorName = secondResultName.toString();
    }
    const plotbuilder = new PlotBuilder(
        table,
        makePlotData(plotType, firstResultName ?? "", resultNameOrSelectorName ?? "", colorBy, ensembleSet, colorSet),
    );

    plotbuilder.setSubplotByColumn(subplotBy);
    plotbuilder.setFormatLabelFunction(makeFormatLabelFunction(ensembleSet));

    if (hoveredRegion) {
        plotbuilder.setHighlightedSubPlots([hoveredRegion]);
    }
    if (hoveredZone) {
        plotbuilder.setHighlightedSubPlots([hoveredZone]);
    }
    if (hoveredFacies) {
        plotbuilder.setHighlightedSubPlots([hoveredFacies]);
    }

    if (plotType === PlotType.SCATTER) {
        plotbuilder.setXAxisOptions({ title: { text: secondResultName ?? "", standoff: 20 } });
        plotbuilder.setYAxisOptions({ title: { text: firstResultName ?? "", standoff: 20 } });
    } else if (plotType === PlotType.CONVERGENCE) {
        plotbuilder.setXAxisOptions({ title: { text: "Realizations", standoff: 5 } });
        plotbuilder.setYAxisOptions({ title: { text: firstResultName ?? "", standoff: 5 } });
    }

    const horizontalSpacing = 80 / width;
    const verticalSpacing = 60 / height;

    const plots = plotbuilder.build(height, width, {
        horizontalSpacing,
        verticalSpacing,
        showGrid: true,
        margin: plotType === PlotType.HISTOGRAM ? { t: 20, b: 50, l: 50, r: 20 } : { t: 20, b: 50, l: 50, r: 20 },
    });

    return { plots, table };
}
