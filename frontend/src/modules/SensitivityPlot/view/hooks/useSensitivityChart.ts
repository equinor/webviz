import type { ViewContext } from "@framework/ModuleContext";
import type { SensitivityColorMap } from "@modules/_shared/sensitivityColors";
import type { SensitivityResponseDataset } from "@modules/_shared/SensitivityProcessing/types";
import type { Interfaces } from "@modules/SensitivityPlot/interfaces";

import { SensitivityChartFigure } from "../components/sensitivityChartFigure";
import type { SensitivityDataScaler } from "../utils/sensitivityDataScaler";

export function useSensitivityChart(
    viewContext: ViewContext<Interfaces>,
    width: number,
    height: number,
    sensitivityColorMap: SensitivityColorMap,
    sensitivityResponseDataset: SensitivityResponseDataset | null,
    sensitivityDataScaler: SensitivityDataScaler,
): SensitivityChartFigure | null {
    const showLabels = viewContext.useSettingsToViewInterfaceValue("showLabels");
    const colorBy = viewContext.useSettingsToViewInterfaceValue("colorBy");
    const showRealizationPoints = viewContext.useSettingsToViewInterfaceValue("showRealizationPoints");

    if (!sensitivityResponseDataset) {
        return null;
    }
    const chartFigure = new SensitivityChartFigure(
        width,
        height,
        sensitivityResponseDataset,
        sensitivityDataScaler,
        sensitivityColorMap,
        {
            colorBy: colorBy,
        },
    );

    if (showRealizationPoints) {
        chartFigure.buildBarTraces(false, true);
        chartFigure.buildRealizationTraces();
    } else {
        chartFigure.buildBarTraces(showLabels);
    }
    return chartFigure;
}
