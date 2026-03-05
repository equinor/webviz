import type { GroupedRealizationsVectorData_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";

import type { HeatmapDataset, PlotDimension } from "../typesAndEnums";

import { computeRecoveryFactor } from "./aggregation";
import { getDimensionLabel } from "./plotDimensions";
import { isInPlaceVector } from "./regionalVectors";
import type { VectorGroupDef } from "./vectorGroups";

// ────────── Helpers ──────────

/**
 * Compute the mean across realizations for each timestep.
 * @param valuesPerRealization - Shape [numReals][numTimesteps]
 * @returns Array of length numTimesteps with the mean values.
 */
function computeMeanPerTimestep(valuesPerRealization: number[][]): number[] {
    const numReals = valuesPerRealization.length;
    if (numReals === 0) return [];
    const numTimesteps = valuesPerRealization[0].length;
    const means = new Array<number>(numTimesteps).fill(0);
    for (let t = 0; t < numTimesteps; t++) {
        let sum = 0;
        for (let r = 0; r < numReals; r++) {
            sum += valuesPerRealization[r][t];
        }
        means[t] = sum / numReals;
    }
    return means;
}

// ────────── Public API ──────────

/**
 * Build heatmap datasets from the grouped query responses.
 *
 * Produces one HeatmapDataset per ensemble. Each dataset has:
 * - Y-axis: region/zone labels (based on the colorBy dimension)
 * - X-axis: formatted date strings
 * - Data: mean RF (or mean raw value) per [timestamp, region] cell
 */
export function buildHeatmapDatasets(
    queries: readonly { data?: unknown }[],
    ensembleIdents: RegularEnsembleIdent[],
    groupMetaMap: Map<string, VectorGroupDef>,
    colorBy: PlotDimension,
    selectedVectorBaseName: string | null,
    showRecoveryFactor: boolean,
    validEnsembleRealizationsFunction: EnsembleRealizationFilterFunction,
): HeatmapDataset[] {
    const applyRecovery = showRecoveryFactor && isInPlaceVector(selectedVectorBaseName);
    const datasets: HeatmapDataset[] = [];

    for (let eIdx = 0; eIdx < ensembleIdents.length; eIdx++) {
        const q = queries[eIdx];
        if (!q?.data) continue;

        const ensembleIdent = ensembleIdents[eIdx];
        const ensembleName = ensembleIdent.getEnsembleName();
        const responseData = q.data as GroupedRealizationsVectorData_api;

        // Filter to valid realizations
        const validRealSet = new Set(validEnsembleRealizationsFunction(ensembleIdent));
        const keepIndices: number[] = [];
        for (let i = 0; i < responseData.realizations.length; i++) {
            if (validRealSet.has(responseData.realizations[i])) {
                keepIndices.push(i);
            }
        }

        const xLabels = responseData.timestampsUtcMs.map((ts) => timestampUtcMsToCompactIsoString(ts));
        const timestampsUtcMs = responseData.timestampsUtcMs;
        const yLabels: string[] = [];
        const heatData: [number, number, number][] = [];
        let minValue = Infinity;
        let maxValue = -Infinity;

        for (const groupEntry of responseData.groups) {
            const groupMeta = groupMetaMap.get(groupEntry.groupLabel);
            if (!groupMeta) continue;

            const yLabel = getDimensionLabel(colorBy, groupMeta.colorKey);
            const yIdx = yLabels.indexOf(yLabel) === -1 ? yLabels.push(yLabel) - 1 : yLabels.indexOf(yLabel);

            // Filter realizations
            let values =
                keepIndices.length < responseData.realizations.length
                    ? keepIndices.map((idx) => groupEntry.valuesPerRealization[idx])
                    : groupEntry.valuesPerRealization;

            if (applyRecovery && values) {
                values = computeRecoveryFactor(values);
            }

            // Compute mean across realizations for each timestep
            const means = computeMeanPerTimestep(values);

            for (let t = 0; t < means.length; t++) {
                const v = means[t];
                heatData.push([t, yIdx, v]);
                if (v < minValue) minValue = v;
                if (v > maxValue) maxValue = v;
            }
        }

        if (yLabels.length > 0 && xLabels.length > 0) {
            datasets.push({
                ensembleTitle: ensembleName,
                yLabels,
                xLabels,
                timestampsUtcMs,
                data: heatData,
                minValue: minValue === Infinity ? 0 : minValue,
                maxValue: maxValue === -Infinity ? 1 : maxValue,
            });
        }
    }

    return datasets;
}
