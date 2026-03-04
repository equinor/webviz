import { atom } from "jotai";

import type { VectorRealizationsData_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { PlotDimension } from "../../typesAndEnums";
import type { ChartTrace, SubplotGroup } from "../../typesAndEnums";
import { computeRecoveryFactor, computeStatistics } from "../../utils/aggregation";
import { DIMENSION_COLORS, getDimensionLabel } from "../../utils/plotDimensions";
import { isInPlaceVector } from "../../utils/regionalVectors";

import {
    colorByAtom,
    ensembleIdentsAtom,
    selectedVectorBaseNameAtom,
    showRecoveryFactorAtom,
    subplotByAtom,
} from "./baseAtoms";
import { groupedVectorDataQueriesAtom, vectorGroupDefsAtom } from "./queryAtoms";

// Re-export types so existing consumers don't break
export type { ChartTrace, SubplotGroup } from "../../typesAndEnums";
export { formatDate } from "../../utils/formatting";

// ────────── Fetching state ──────────

export const isDataFetchingAtom = atom<boolean>((get) => {
    const queries = get(groupedVectorDataQueriesAtom);
    return queries.some((q) => q.isFetching);
});

export const allQueriesFailedAtom = atom<boolean>((get) => {
    const queries = get(groupedVectorDataQueriesAtom);
    return queries.length > 0 && queries.every((q) => q.isError);
});

// ────────── Chart data atoms ──────────

/**
 * Build subplot groups directly from the grouped backend responses.
 *
 * Each query result entry corresponds to one VectorGroupDef with the same
 * `groupLabel` (returned as `vectorName`).  The backend has already summed
 * the regional vectors within each group, so the view only needs to:
 *   1. Match response entries to group metadata (subplotKey, colorKey)
 *   2. Optionally apply recovery factor
 *   3. Compute statistics
 *   4. Assemble traces into subplot groups
 */
export const subplotGroupsAtom = atom<SubplotGroup[]>((get) => {
    const queries = get(groupedVectorDataQueriesAtom);
    const groupDefs = get(vectorGroupDefsAtom);
    const colorBy = get(colorByAtom);
    const subplotBy = get(subplotByAtom);
    const ensembleIdents = get(ensembleIdentsAtom);
    const ensembleSet = get(EnsembleSetAtom);
    const showRecoveryFactor = get(showRecoveryFactorAtom);
    const selectedVectorBaseName = get(selectedVectorBaseNameAtom);
    const applyRecovery = showRecoveryFactor && isInPlaceVector(selectedVectorBaseName);

    if (!colorBy || groupDefs.length === 0) {
        return [];
    }

    // Build group label → metadata lookup
    const groupMetaMap = new Map(groupDefs.map((g) => [g.groupLabel, g]));

    // Build ensemble name → color map
    const ensembleColorMap = new Map<string, string>();
    for (const ident of ensembleIdents) {
        const color = ensembleSet.findEnsemble(ident)?.getColor();
        if (color) {
            ensembleColorMap.set(ident.getEnsembleName(), color);
        }
    }

    // Collect all traces with their subplot/color keys
    type TraceEntry = {
        subplotKey: string;
        colorKey: string;
        trace: ChartTrace;
    };
    const traceEntries: TraceEntry[] = [];

    for (let eIdx = 0; eIdx < ensembleIdents.length; eIdx++) {
        const q = queries[eIdx];
        if (!q?.data) continue;

        const ensembleIdent = ensembleIdents[eIdx];
        const ensembleName = ensembleIdent.getEnsembleName();
        const responseData = q.data as VectorRealizationsData_api[];

        for (const entry of responseData) {
            const groupMeta = groupMetaMap.get(entry.vectorName);
            if (!groupMeta) continue;

            // Resolve actual subplot/color keys — for Ensemble dimension,
            // the key comes from the ensemble, not from the group
            const subplotKey = subplotBy
                ? subplotBy === PlotDimension.Ensemble
                    ? ensembleName
                    : groupMeta.subplotKey
                : "_all";
            const colorKey = colorBy === PlotDimension.Ensemble ? ensembleName : groupMeta.colorKey;

            // Apply recovery factor if needed
            let values = entry.valuesPerRealization;
            if (applyRecovery && values) {
                values = computeRecoveryFactor(values);
            }

            const stats = values ? computeStatistics(values) : null;

            traceEntries.push({
                subplotKey,
                colorKey,
                trace: {
                    label: getDimensionLabel(colorBy, colorKey),
                    color: "", // assigned below
                    timestamps: entry.timestampsUtcMs,
                    stats,
                    realizations: entry.realizations,
                    aggregatedValues: values,
                    ensembleIdentString: ensembleIdent.toString(),
                },
            });
        }
    }

    if (traceEntries.length === 0) return [];

    // Assign colors — build global color key list for consistent coloring
    const allColorKeys: string[] = [];
    const seenColorKeys = new Set<string>();
    for (const te of traceEntries) {
        if (!seenColorKeys.has(te.colorKey)) {
            allColorKeys.push(te.colorKey);
            seenColorKeys.add(te.colorKey);
        }
    }

    for (const te of traceEntries) {
        const ensembleColor = colorBy === PlotDimension.Ensemble ? ensembleColorMap.get(te.colorKey) : undefined;
        const colorIdx = allColorKeys.indexOf(te.colorKey);
        te.trace.color = ensembleColor ?? DIMENSION_COLORS[colorIdx % DIMENSION_COLORS.length];
    }

    // Group traces into subplots, preserving insertion order
    const subplotMap = new Map<string, ChartTrace[]>();
    const subplotKeyOrder: string[] = [];

    for (const te of traceEntries) {
        if (!subplotMap.has(te.subplotKey)) {
            subplotMap.set(te.subplotKey, []);
            subplotKeyOrder.push(te.subplotKey);
        }
        subplotMap.get(te.subplotKey)!.push(te.trace);
    }

    return subplotKeyOrder.map((key) => ({
        title: subplotBy && key !== "_all" ? getDimensionLabel(subplotBy, key) : "",
        traces: subplotMap.get(key)!,
    }));
});
