import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { PlotDimension } from "../typesAndEnums";

// ────────── Dimension key / label helpers ──────────

/**
 * Get the grouping key for a data point along a given dimension.
 */
export function getDimensionKey(
    dim: PlotDimension,
    ensembleIdx: number,
    ensembleIdents: RegularEnsembleIdent[],
    fipNumber: number,
    fipRegionLabels: Record<number, { zone: string; region: string }>,
): string {
    switch (dim) {
        case PlotDimension.Ensemble:
            return ensembleIdents[ensembleIdx].getEnsembleName();
        case PlotDimension.FipRegion:
            return String(fipNumber);
        case PlotDimension.Zone:
            return fipRegionLabels[fipNumber]?.zone ?? `FIP ${fipNumber}`;
        case PlotDimension.GeoRegion:
            return fipRegionLabels[fipNumber]?.region ?? `FIP ${fipNumber}`;
    }
}

/**
 * Get a human-readable label for a dimension key.
 */
export function getDimensionLabel(dim: PlotDimension, key: string): string {
    switch (dim) {
        case PlotDimension.Ensemble:
            return key;
        case PlotDimension.FipRegion:
            return `Region ${key}`;
        case PlotDimension.Zone:
            return key;
        case PlotDimension.GeoRegion:
            return key;
    }
}

// ────────── Color palette ──────────

export const DIMENSION_COLORS = [
    "#1976d2",
    "#e53935",
    "#43a047",
    "#fb8c00",
    "#8e24aa",
    "#00897b",
    "#d81b60",
    "#5e35b1",
    "#00acc1",
    "#7cb342",
];
