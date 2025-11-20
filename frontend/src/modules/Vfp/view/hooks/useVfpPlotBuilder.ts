import React from "react";

import type { ViewContext } from "@framework/ModuleContext";
import { useContinuousColorScale, type WorkbenchSettings } from "@framework/WorkbenchSettings";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import type { Size2D } from "@lib/utils/geometry";
import type { Interfaces } from "@modules/Vfp/interfaces";
import { VfpType } from "@modules/Vfp/types";
import type { Layout, PlotData } from "plotly.js";

import { VfpPlotBuilder } from "../utils/vfpPlotBuilder";

export function usePlotBuilder(
    viewContext: ViewContext<Interfaces>,
    workbenchSettings: WorkbenchSettings,
    plotSize: Size2D,
): { data: Partial<PlotData>[]; layout: Partial<Layout> } | null {
    const colorScale = useContinuousColorScale(workbenchSettings, { gradientType: ColorScaleGradientType.Sequential });

    const { tableDataAccessor } = viewContext.useSettingsToViewInterfaceValue("tableDataAccessorWithStatusFlags");
    const selectedThpIndices = viewContext.useSettingsToViewInterfaceValue("selectedThpIndices");
    const selectedWfrIndices = viewContext.useSettingsToViewInterfaceValue("selectedWfrIndices");
    const selectedGfrIndices = viewContext.useSettingsToViewInterfaceValue("selectedGfrIndices");
    const selectedAlqIndices = viewContext.useSettingsToViewInterfaceValue("selectedAlqIndices");
    const selectedPressureOption = viewContext.useSettingsToViewInterfaceValue("selectedPressureOption");
    const selectedColorBy = viewContext.useSettingsToViewInterfaceValue("selectedColorBy");

    // Memoize plot builder to avoid unnecessary re-creation
    const vfpTypeAndPlotBuilder = React.useMemo<{ type: VfpType; plotBuilder: VfpPlotBuilder } | null>(
        function makeVfpTypeAndPlotBuilder() {
            if (!tableDataAccessor) {
                return null;
            }

            return {
                type: tableDataAccessor.getVfpType(),
                plotBuilder: new VfpPlotBuilder(tableDataAccessor, colorScale),
            };
        },
        [tableDataAccessor, colorScale],
    );

    const plotData = React.useMemo(
        function makePlotData() {
            if (!vfpTypeAndPlotBuilder) {
                return null;
            }
            if (vfpTypeAndPlotBuilder.type === VfpType.VFPPROD) {
                return vfpTypeAndPlotBuilder.plotBuilder.makeVfpProdTraces(
                    selectedThpIndices,
                    selectedWfrIndices,
                    selectedGfrIndices,
                    selectedAlqIndices,
                    selectedPressureOption,
                    selectedColorBy,
                );
            }
            if (vfpTypeAndPlotBuilder.type === VfpType.VFPINJ) {
                return vfpTypeAndPlotBuilder.plotBuilder.makeVfpInjTraces(selectedThpIndices, selectedPressureOption);
            }

            throw new Error(`Unsupported VFP type: ${vfpTypeAndPlotBuilder.type}`);
        },
        [
            selectedAlqIndices,
            selectedColorBy,
            selectedGfrIndices,
            selectedPressureOption,
            selectedThpIndices,
            selectedWfrIndices,
            vfpTypeAndPlotBuilder,
        ],
    );

    const plotLayout = React.useMemo(
        function makePlotLayout() {
            if (!vfpTypeAndPlotBuilder) {
                return null;
            }
            return vfpTypeAndPlotBuilder.plotBuilder.makeLayout(plotSize, selectedPressureOption);
        },
        [vfpTypeAndPlotBuilder, plotSize, selectedPressureOption],
    );

    if (!plotData || !plotLayout) {
        return null;
    }

    return { data: plotData, layout: plotLayout };
}
