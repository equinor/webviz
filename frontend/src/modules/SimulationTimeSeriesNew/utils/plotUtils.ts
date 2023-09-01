import { UseQueryResult } from "@tanstack/react-query";

import { PlotData } from "plotly.js";

import { VectorSpec } from "../state";

export interface TimeSeriesPlotData extends Partial<PlotData> {
    realizationNumber?: number | null;

    // Did they forget to expose this one
    legendrank?: number;
}

export function createLoadedVectorSpecificationAndDataArray<T>(
    vectorSpecifications: VectorSpec[],
    queryResults: UseQueryResult<T>[]
): { vectorSpecification: VectorSpec; data: T }[] {
    // number of specifications and results must be equal
    if (vectorSpecifications.length !== queryResults.length) return [];

    const output: { vectorSpecification: VectorSpec; data: T }[] = [];
    for (let i = 0; i < queryResults.length; ++i) {
        const result = queryResults[i];
        if (!result.data) continue;

        output.push({ vectorSpecification: vectorSpecifications[i], data: result.data });
    }

    return output;
}
