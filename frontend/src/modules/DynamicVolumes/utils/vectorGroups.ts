import type { VectorGroupInput_api } from "@api";

import { PlotDimension } from "../typesAndEnums";

import { parseRegionalVector } from "./regionalVectors";

// ────────── Types ──────────

/**
 * A vector group with metadata for building subplot/trace structure.
 *
 * The `groupLabel` is sent to the backend as the group identifier and
 * returned as the `vectorName` in the response.
 */
export type VectorGroupDef = {
    /** Unique label sent to/from backend */
    groupLabel: string;
    /** Subplot-level key derived from FIP dimensions ("_all" if subplotBy is Ensemble or null) */
    subplotKey: string;
    /** Color-level key derived from FIP dimensions ("_all" if colorBy is Ensemble) */
    colorKey: string;
    /** Vector names belonging to this group */
    vectorNames: string[];
};

// ────────── Helpers ──────────

/**
 * Get the FIP-dimension grouping key for a single FIP number.
 *
 * For the Ensemble dimension this returns "_all" since ensemble
 * differentiation is handled at the per-query level, not within groups.
 */
function getFipGroupKey(
    dim: PlotDimension,
    fip: number,
    fipRegionLabels: Record<number, { zone: string; region: string }>,
): string {
    switch (dim) {
        case PlotDimension.Ensemble:
            return "_all";
        case PlotDimension.FipRegion:
            return String(fip);
        case PlotDimension.Zone:
            return fipRegionLabels[fip]?.zone ?? `FIP ${fip}`;
        case PlotDimension.GeoRegion:
            return fipRegionLabels[fip]?.region ?? `FIP ${fip}`;
    }
}

/**
 * Compute vector group definitions based on the current colorBy/subplotBy
 * dimension configuration.
 *
 * Each group contains the vector names that should be summed together on
 * the server.  The resulting groups are the same for every ensemble.
 *
 * @returns Array of VectorGroupDef, one per unique (subplotKey, colorKey) combination.
 */
export function computeVectorGroupDefs(
    selectedRegions: number[],
    fipRegionLabels: Record<number, { zone: string; region: string }>,
    colorBy: PlotDimension,
    subplotBy: PlotDimension | null,
    vectorNamesToFetch: string[],
): VectorGroupDef[] {
    if (selectedRegions.length === 0 || vectorNamesToFetch.length === 0) {
        return [];
    }

    // Build FIP number → vector name map from the flat list
    const fipToVectorName = new Map<number, string>();
    for (const vn of vectorNamesToFetch) {
        const parsed = parseRegionalVector(vn);
        if (parsed) {
            fipToVectorName.set(parsed.region, vn);
        }
    }

    // Group FIP numbers by their (subplotKey, colorKey) combination
    const groupMap = new Map<string, { subplotKey: string; colorKey: string; vectorNames: string[] }>();
    const insertionOrder: string[] = [];

    for (const fip of selectedRegions) {
        const vecName = fipToVectorName.get(fip);
        if (!vecName) continue;

        const subplotKey = subplotBy ? getFipGroupKey(subplotBy, fip, fipRegionLabels) : "_all";
        const colorKey = getFipGroupKey(colorBy, fip, fipRegionLabels);
        const groupLabel = `${subplotKey}\0${colorKey}`;

        if (!groupMap.has(groupLabel)) {
            groupMap.set(groupLabel, { subplotKey, colorKey, vectorNames: [] });
            insertionOrder.push(groupLabel);
        }
        groupMap.get(groupLabel)!.vectorNames.push(vecName);
    }

    return insertionOrder.map((label) => {
        const g = groupMap.get(label)!;
        return {
            groupLabel: label,
            subplotKey: g.subplotKey,
            colorKey: g.colorKey,
            vectorNames: g.vectorNames,
        };
    });
}

/**
 * Convert VectorGroupDef[] to the API body format.
 */
export function toApiGroups(defs: VectorGroupDef[]): VectorGroupInput_api[] {
    return defs.map((d) => ({
        groupLabel: d.groupLabel,
        vectorNames: d.vectorNames,
    }));
}
