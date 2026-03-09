import { atom } from "jotai";

import type { EnsembleFipRegions } from "@framework/EnsembleFipRegions";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { RegionSelectionMode } from "../../typesAndEnums";
import { areFipMappingsCompatible } from "../../utils/fipCompatibility";
import type { RegionalVectorsInfo } from "../../utils/regionalVectors";
import { extractRegionalVectorsInfo } from "../../utils/regionalVectors";

import { regionSelectionModeAtom } from "./baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedFipArrayAtom,
    selectedRegionNamesAtom,
    selectedRegionsAtom,
    selectedVectorBaseNameAtom,
    selectedZoneNamesAtom,
} from "./persistableFixableAtoms";
import { vectorListQueriesAtom } from "./queryAtoms";

/** Whether any of the vector list queries are currently loading */
export const isVectorListFetchingAtom = atom<boolean>((get) => {
    const queries = get(vectorListQueriesAtom);
    return queries.some((q) => q.isFetching);
});

/**
 * Intersection of vector names across all selected ensembles.
 * Only vectors present in **every** ensemble are offered.
 */
const allVectorNamesAtom = atom<string[]>((get) => {
    const queries = get(vectorListQueriesAtom);
    const loadedResults = queries.filter((q) => q.data != null);
    if (loadedResults.length === 0) return [];

    // Start from the first ensemble's vector names
    let intersection: Set<string> | null = null;
    for (const q of loadedResults) {
        const names = new Set(q.data!.map((v) => v.name));
        if (intersection === null) {
            intersection = names;
        } else {
            // Keep only vectors found in every ensemble
            for (const n of intersection) {
                if (!names.has(n)) intersection.delete(n);
            }
        }
    }

    return intersection ? [...intersection].sort() : [];
});

/** Parsed regional vectors info from the intersected vector list */
export const regionalVectorsInfoAtom = atom<RegionalVectorsInfo>((get) => {
    const allNames = get(allVectorNamesAtom);
    return extractRegionalVectorsInfo(allNames);
});

// ────────── FIP regions from ensemble metadata ──────────

/**
 * The shared EnsembleFipRegions when ALL selected ensembles have compatible
 * FIP region mappings.  Returns null when any ensemble is missing FIP data
 * or when ensembles have mismatching mappings.
 */
export const ensembleFipRegionsAtom = atom<EnsembleFipRegions | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedIdents = get(selectedEnsembleIdentsAtom).value ?? [];
    if (selectedIdents.length === 0) return null;

    let reference: EnsembleFipRegions | null = null;
    for (const ident of selectedIdents) {
        const ensemble = ensembleSet.findEnsemble(ident);
        const fipRegions = ensemble?.getFipRegions?.() ?? null;
        if (!fipRegions) return null; // missing in one ensemble → not available
        if (reference === null) {
            reference = fipRegions;
        } else if (!areFipMappingsCompatible(reference, fipRegions)) {
            return null; // mismatch → not available
        }
    }
    return reference;
});

/** Whether FIP region mapping data is available for zone/region selection */
export const hasFipRegionsDataAtom = atom<boolean>((get) => {
    return get(ensembleFipRegionsAtom) !== null;
});

/**
 * Human-readable reason why Zone/Region mode is disabled, or null if it is
 * available.  Used by the settings UI to show a disabled radio with tooltip.
 */
export const fipRegionsDisabledReasonAtom = atom<string | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedIdents = get(selectedEnsembleIdentsAtom).value ?? [];
    if (selectedIdents.length === 0) return "No ensembles selected";

    let reference: EnsembleFipRegions | null = null;
    const missing: string[] = [];
    let hasMismatch = false;

    for (const ident of selectedIdents) {
        const ensemble = ensembleSet.findEnsemble(ident);
        const fipRegions = ensemble?.getFipRegions?.() ?? null;
        if (!fipRegions) {
            missing.push(ident.getEnsembleName());
            continue;
        }
        if (reference === null) {
            reference = fipRegions;
        } else if (!areFipMappingsCompatible(reference, fipRegions)) {
            hasMismatch = true;
        }
    }

    if (missing.length > 0) {
        return `FIP region mapping missing in: ${missing.join(", ")}`;
    }
    if (hasMismatch) {
        return "FIP region mappings differ between selected ensembles";
    }
    return null;
});

// ────────── Effective region selection mode ──────────

/**
 * The effective region selection mode. Falls back to FipNumber when
 * zone/region is unavailable (missing or incompatible FIP mappings).
 */
export const effectiveRegionSelectionModeAtom = atom<RegionSelectionMode>((get) => {
    const requested = get(regionSelectionModeAtom);
    if (requested === RegionSelectionMode.ZoneRegion && get(ensembleFipRegionsAtom) === null) {
        return RegionSelectionMode.FipNumber;
    }
    return requested;
});

// ────────── Zone / region option lists ──────────

/** All zones from the FIP region mapping */
export const allZoneNamesAtom = atom<string[]>((get) => {
    const fipRegions = get(ensembleFipRegionsAtom);
    return fipRegions?.getZones() ?? [];
});

/** All region names from the FIP region mapping */
export const allRegionNamesAtom = atom<string[]>((get) => {
    const fipRegions = get(ensembleFipRegionsAtom);
    return fipRegions?.getRegions() ?? [];
});

// ────────── FIP region labels for view ──────────

/**
 * Map from selected FIP numbers to their zone/region labels.
 * Returns an empty object when no FIP region mapping is available.
 */
export const fipRegionLabelsAtom = atom<Record<number, { zone: string; region: string }>>((get) => {
    const fipRegions = get(ensembleFipRegionsAtom);
    const selectedFipNumbers = get(effectiveSelectedRegionsAtom);
    if (!fipRegions) return {};

    const labels: Record<number, { zone: string; region: string }> = {};
    for (const fip of selectedFipNumbers) {
        const zr = fipRegions.getZoneRegionForFipNumber(fip);
        if (zr) labels[fip] = zr;
    }
    return labels;
});

// ────────── Effective regions (resolved FIP numbers) ──────────

/**
 * The effective FIP region numbers to use, regardless of selection mode.
 *
 * - In FipNumber mode: returns the directly selected FIP numbers.
 * - In ZoneRegion mode: resolves selected zone×region combinations to FIP numbers
 *   using the ensemble's FIP region mapping.
 */
export const effectiveSelectedRegionsAtom = atom<number[]>((get) => {
    const mode = get(effectiveRegionSelectionModeAtom);

    if (mode === RegionSelectionMode.FipNumber) {
        return get(selectedRegionsAtom).value;
    }

    // ZoneRegion mode — resolve zone + region names to FIP numbers
    const fipRegions = get(ensembleFipRegionsAtom);
    if (!fipRegions) return [];

    const selectedZones = get(selectedZoneNamesAtom).value;
    const selectedRegionNameValues = get(selectedRegionNamesAtom).value;

    const fipNumbers = new Set<number>();
    for (const zone of selectedZones) {
        for (const region of selectedRegionNameValues) {
            const fip = fipRegions.getFipNumberForZoneRegion(zone, region);
            if (fip !== undefined) {
                fipNumbers.add(fip);
            }
        }
    }
    return [...fipNumbers].sort((a, b) => a - b);
});

/**
 * The list of full vector names (e.g. "ROIP:1", "ROIP:2") to fetch,
 * derived from the selected base name, FIP array, and effective regions.
 * This list is the **same** for every ensemble.
 */
export const selectedVectorNamesToFetchAtom = atom<string[]>((get) => {
    const baseName = get(selectedVectorBaseNameAtom).value;
    const fipArray = get(selectedFipArrayAtom).value;
    const regions = get(effectiveSelectedRegionsAtom);
    const info = get(regionalVectorsInfoAtom);

    if (!baseName || !fipArray || regions.length === 0) return [];

    // Determine suffix from FIP array (FIPNUM → no suffix, FIPPLT → _PLT)
    const suffix = fipArray === "FIPNUM" ? "" : `_${fipArray.replace("FIP", "")}`;

    // Only include regions that actually exist for this FIP array
    const availableRegions = new Set(info.fipArrays[fipArray] ?? []);

    return regions.filter((r) => availableRegions.has(r)).map((r) => `${baseName}${suffix}:${r}`);
});
