import type { SensitivityColorMap } from "@modules/_shared/sensitivityColors";
import type { SelectedSensitivity, XAxisBarScaling } from "@modules/TornadoChart/typesAndEnums";
import type { PlotData } from "plotly.js";

import type { SensitivityResponseDataset } from "../../utils/sensitivityResponseCalculator";

export enum TraceGroup {
    LOW = "Low",
    HIGH = "High",
}

export type SensitivityColors = {
    sensitivityName: string;
    color: string;
};

export type SelectedBar = {
    group: TraceGroup;
    index: number;
};

export interface SensitivityChartTraceData extends Partial<PlotData> {
    base: number[];
    insidetextanchor: "middle" | "start" | "end";
}

export type SensitivityChartProps = {
    sensitivityResponseDataset: SensitivityResponseDataset;
    sensitivityColorMap: SensitivityColorMap;
    showLabels: boolean;
    hideZeroY: boolean;
    showRealizationPoints: boolean;
    xAxisBarScaling: XAxisBarScaling;
    onSelectedSensitivity?: (selectedSensitivity: SelectedSensitivity) => void;
    height?: number | 100;
    width?: number | 100;
};
