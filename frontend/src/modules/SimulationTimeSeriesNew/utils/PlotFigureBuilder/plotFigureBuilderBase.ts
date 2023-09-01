import { VectorHistoricalData_api, VectorRealizationData_api, VectorStatisticData_api } from "@api";

import { Annotations, Layout } from "plotly.js";

import { VectorSpec } from "../../state";
import { TimeSeriesPlotData } from "../plotUtils";

// TODO: Rename to PlotDataBuilderBase if only building plot data
/// - Figure contains both data, layout and frames
export abstract class PlotFigureBuilderBase {
    // NOTE:
    // - Use PlotData from plotly.js or build entire Figure from react-plotly.js?

    // Build/create plot data after all trace data is added
    abstract createPlotData(): Partial<TimeSeriesPlotData>[];
    abstract createPlotLayout(): Partial<Layout>;

    // Interface to add traces
    abstract addRealizationsTraces(
        vectorsRealizationData: { vectorSpecification: VectorSpec; data: VectorRealizationData_api[] }[],
        useIncreasedBrightness: boolean
    ): void;

    abstract addStatisticsTraces(
        vectorsStatisticData: { vectorSpecification: VectorSpec; data: VectorStatisticData_api }[],
        highlightStatisticTraces: boolean
    ): void;
    abstract addFanchartTraces(
        vectorsStatisticData: { vectorSpecification: VectorSpec; data: VectorStatisticData_api }[]
    ): void;
    abstract addHistoryTraces(
        vectorsHistoricalData: {
            vectorSpecification: VectorSpec;
            data: VectorHistoricalData_api;
        }[]
    ): void;
    abstract addVectorObservations(): void;

    // TODO: Should be private - remove from interface?
    abstract createGraphLegends(): void;
    abstract subplotTitles(): Partial<Annotations>[];
}
