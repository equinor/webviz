import type { GroupedRealizationsVectorData_api } from "@api";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";

import { PlotDimension } from "../typesAndEnums";
import type { ChartTrace, SubplotGroup } from "../typesAndEnums";

import { computeRecoveryFactor, computeStatistics } from "./aggregation";
import { DIMENSION_COLORS, getDimensionLabel } from "./plotDimensions";
import { isInPlaceVector } from "./regionalVectors";
import type { VectorGroupDef } from "./vectorGroups";

// ────────── Types ──────────

type TraceEntry = {
    subplotKey: string;
    colorKey: string;
    trace: ChartTrace;
};

// ────────── Helpers ──────────

/**
 * Build a map from ensemble name → ensemble colour string.
 */
export function buildEnsembleColorMap(
    ensembleIdents: RegularEnsembleIdent[],
    ensembleSet: EnsembleSet,
): Map<string, string> {
    const colorMap = new Map<string, string>();
    for (const ident of ensembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ident);

        if (ensemble) {
            const color = ensemble.getColor();
            colorMap.set(ensemble.getDisplayName(), color);
        }
    }
    return colorMap;
}

/**
 * Convert grouped query responses into flat trace entries, resolving
 * subplot/color keys and optionally applying recovery-factor.
 */
export function buildTraceEntries(
    queries: readonly { data?: unknown }[],
    ensembleSet: EnsembleSet,
    ensembleIdents: RegularEnsembleIdent[],
    groupMetaMap: Map<string, VectorGroupDef>,
    colorBy: PlotDimension,
    subplotBy: PlotDimension | null,
    selectedVectorBaseName: string | null,
    showRecoveryFactor: boolean,
    validEnsembleRealizationsFunction: EnsembleRealizationFilterFunction,
): TraceEntry[] {
    const applyRecovery = showRecoveryFactor && isInPlaceVector(selectedVectorBaseName);
    const entries: TraceEntry[] = [];

    for (let eIdx = 0; eIdx < ensembleIdents.length; eIdx++) {
        const q = queries[eIdx];
        if (!q?.data) continue;

        const ensembleIdent = ensembleIdents[eIdx];
        // Find ensemble
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (!ensemble) continue;

        const ensembleName = ensemble.getDisplayName();
        const responseData = q.data as GroupedRealizationsVectorData_api;

        // Filter to only valid realizations for this ensemble
        const validRealSet = new Set(validEnsembleRealizationsFunction(ensembleIdent));
        const keepIndices: number[] = [];
        const filteredRealizations: number[] = [];
        for (let i = 0; i < responseData.realizations.length; i++) {
            if (validRealSet.has(responseData.realizations[i])) {
                keepIndices.push(i);
                filteredRealizations.push(responseData.realizations[i]);
            }
        }

        const { timestampsUtcMs } = responseData;
        const realizations = filteredRealizations;

        for (const groupEntry of responseData.groups) {
            const groupMeta = groupMetaMap.get(groupEntry.groupLabel);
            if (!groupMeta) continue;

            const subplotKey = subplotBy
                ? subplotBy === PlotDimension.Ensemble
                    ? ensembleName
                    : groupMeta.subplotKey
                : "_all";
            const colorKey = colorBy === PlotDimension.Ensemble ? ensembleName : groupMeta.colorKey;

            let values =
                keepIndices.length < responseData.realizations.length
                    ? keepIndices.map((idx) => groupEntry.valuesPerRealization[idx])
                    : groupEntry.valuesPerRealization;
            if (applyRecovery && values) {
                values = computeRecoveryFactor(values);
            }

            entries.push({
                subplotKey,
                colorKey,
                trace: {
                    label: getDimensionLabel(colorBy, colorKey),
                    color: "", // assigned by assignTraceColors
                    timestamps: timestampsUtcMs,
                    stats: values ? computeStatistics(values) : null,
                    realizations,
                    aggregatedValues: values,
                    ensembleIdentString: ensembleIdent.toString(),
                },
            });
        }
    }

    return entries;
}

/**
 * Assign colours to trace entries.  Ensemble-dimension traces use the
 * ensemble colour; all others are assigned from a fixed palette keyed by
 * insertion order.
 */
export function assignTraceColors(
    traceEntries: TraceEntry[],
    colorBy: PlotDimension,
    ensembleColorMap: Map<string, string>,
): void {
    // Build ordered unique color-key list
    const orderedColorKeys: string[] = [];
    const seen = new Set<string>();
    for (const te of traceEntries) {
        if (!seen.has(te.colorKey)) {
            orderedColorKeys.push(te.colorKey);
            seen.add(te.colorKey);
        }
    }

    for (const te of traceEntries) {
        const ensembleColor = colorBy === PlotDimension.Ensemble ? ensembleColorMap.get(te.colorKey) : undefined;
        const colorIdx = orderedColorKeys.indexOf(te.colorKey);
        te.trace.color = ensembleColor ?? DIMENSION_COLORS[colorIdx % DIMENSION_COLORS.length];
    }
}

/**
 * Group trace entries into subplot groups, preserving insertion order.
 */
export function groupTracesIntoSubplots(traceEntries: TraceEntry[], subplotBy: PlotDimension | null): SubplotGroup[] {
    const subplotMap = new Map<string, ChartTrace[]>();
    const keyOrder: string[] = [];

    for (const te of traceEntries) {
        if (!subplotMap.has(te.subplotKey)) {
            subplotMap.set(te.subplotKey, []);
            keyOrder.push(te.subplotKey);
        }
        subplotMap.get(te.subplotKey)!.push(te.trace);
    }

    return keyOrder.map((key) => ({
        title: subplotBy && key !== "_all" ? getDimensionLabel(subplotBy, key) : "",
        traces: subplotMap.get(key)!,
    }));
}
