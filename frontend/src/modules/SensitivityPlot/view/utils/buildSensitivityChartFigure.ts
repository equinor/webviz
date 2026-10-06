import type { SensitivityColorMap } from "@modules/_shared/sensitivityColors";
import type { SensitivityResponseDataset } from "@modules/_shared/SensitivityProcessing";

import { type ColorBy, SensitivityChartFigure } from "../components/sensitivityChartFigure";

import type { SensitivityDataScaler } from "./sensitivityDataScaler";

export type SensitivityChartOptions = {
    showLabels: boolean;
    showSensitivityMeanPoints: boolean;
    showRealizationPoints: boolean;
    colorBy: ColorBy;
};

export function buildSensitivityChartFigure(
    width: number,
    height: number,
    sensitivityColorMap: SensitivityColorMap,
    sensitivityResponseDataset: SensitivityResponseDataset,
    sensitivityDataScaler: SensitivityDataScaler,
    options: SensitivityChartOptions,
): SensitivityChartFigure {
    const { showLabels, showSensitivityMeanPoints, showRealizationPoints, colorBy } = options;

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
    if (showSensitivityMeanPoints) {
        chartFigure.buildMeanPointTrace();
    }
    return chartFigure;
}
