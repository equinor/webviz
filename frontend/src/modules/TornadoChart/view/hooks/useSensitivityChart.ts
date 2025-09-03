import { useMemo } from "react";

import type { ViewContext } from "@framework/ModuleContext";
import type { SensitivityColorMap } from "@modules/_shared/sensitivityColors";
import type { SensitivityResponseDataset } from "@modules/_shared/SensitivityProcessing/types";
import type { Interfaces } from "@modules/TornadoChart/interfaces";

import type { ColorBy } from "../components/sensitivityChartFigure";
import { SensitivityChartFigure } from "../components/sensitivityChartFigure";
import type { SensitivityDataScaler } from "../utils/sensitivityDataScaler";

export function useSensitivityChart(
    viewContext: ViewContext<Interfaces>,
    width: number,
    height: number,
    sensitivityColorMap: SensitivityColorMap,
    sensitivityResponseDataset: SensitivityResponseDataset | null,
    sensitivityDataScaler: SensitivityDataScaler,
    colorBy: ColorBy,
): SensitivityChartFigure | null {
    const showLabels = viewContext.useSettingsToViewInterfaceValue("showLabels");

    const showRealizationPoints = viewContext.useSettingsToViewInterfaceValue("showRealizationPoints");

    const chartFigure = useMemo(() => {
        if (!sensitivityResponseDataset) {
            return null;
        }
        const figure = new SensitivityChartFigure(
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
            figure.buildBarTraces(false, true);
            figure.buildRealizationTraces();
        } else {
            figure.buildBarTraces(showLabels);
        }
        return figure;
    }, [
        width,
        height,
        sensitivityResponseDataset,
        sensitivityColorMap,
        sensitivityDataScaler,
        showRealizationPoints,
        showLabels,
        colorBy,
    ]);
    return chartFigure;
}
