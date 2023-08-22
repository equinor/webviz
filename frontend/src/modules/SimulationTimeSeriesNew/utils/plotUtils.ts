import { VectorRealizationData_api } from "@api";
import { UseQueryResult } from "@tanstack/react-query";

import { PlotData } from "plotly.js";

import { colors } from "./colors";

import { VectorSpec } from "../state";

export interface TimeSeriesPlotData extends Partial<PlotData> {
    realizationNumber?: number | null;

    // Did they forget to expose this one
    legendrank?: number;
}

export type VectorSpecificationAndRealizationData = {
    vectorSpecification: VectorSpec;
    realizationData: VectorRealizationData_api[];
};

export function createLoadedVectorSpecificationAndRealizationDataArray(
    vectorSpecifications: VectorSpec[],
    queryResults: UseQueryResult<VectorRealizationData_api[]>[]
): VectorSpecificationAndRealizationData[] {
    // number of specifications and results must be equal
    if (vectorSpecifications.length !== queryResults.length) return [];

    const output: VectorSpecificationAndRealizationData[] = [];
    for (let i = 0; i < queryResults.length; ++i) {
        const result = queryResults[i];
        if (!result.data) continue;

        output.push({ vectorSpecification: vectorSpecifications[i], realizationData: result.data });
    }

    return output;
}

// TODO: To be replaced when "plot builders" are introduced
export function createTimeSeriesPlotDataArray(
    vectorSpecificationsAndRealizationData: VectorSpecificationAndRealizationData[]
): TimeSeriesPlotData[] {
    const output: TimeSeriesPlotData[] = [];

    let counter = 0;
    for (const elm of vectorSpecificationsAndRealizationData) {
        const vectorName = elm.vectorSpecification.vectorName;
        const ensembleName = elm.vectorSpecification.ensembleIdent.getEnsembleName();
        let highlightedTrace: TimeSeriesPlotData | null = null;
        for (const realizationData of elm.realizationData) {
            const isHighlighted = false; //vec.realization === subscribedPlotlyRealization?.realization ? true : false;
            const curveColor = colors[counter];
            // vec.realization === subscribedPlotlyRealization?.realization ? "red" : colors[counter];
            const lineWidth = 1; //vec.realization === subscribedPlotlyRealization?.realization ? 3 : 1;
            const lineShape = realizationData.is_rate ? "vh" : "linear";
            const trace: TimeSeriesPlotData = {
                x: realizationData.timestamps,
                y: realizationData.values,
                name: `real-${realizationData.realization}`,
                realizationNumber: realizationData.realization,
                // legendrank: vec.realization,
                type: "scatter",
                mode: "lines",
                line: { color: curveColor, width: lineWidth, shape: lineShape },
            };

            if (isHighlighted) {
                highlightedTrace = trace;
            } else {
                output.push(trace);
            }
        }

        if (highlightedTrace) {
            output.push(highlightedTrace);
        }
        counter = (counter + 1) % colors.length;
    }
    return output;
}
