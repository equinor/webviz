import { atom } from "jotai";

import type { RegionalVectorsInfo } from "../../utils/regionalVectors";
import { extractRegionalVectorsInfo } from "../../utils/regionalVectors";

import {
    selectedFipArrayAtom,
    selectedRegionsAtom,
    selectedVectorBaseNameAtom,
} from "./baseAtoms";
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

/**
 * The list of full vector names (e.g. "ROIP:1", "ROIP:2") to fetch,
 * derived from the selected base name, FIP array, and regions.
 * This list is the **same** for every ensemble.
 */
export const selectedVectorNamesToFetchAtom = atom<string[]>((get) => {
    const baseName = get(selectedVectorBaseNameAtom);
    const fipArray = get(selectedFipArrayAtom);
    const regions = get(selectedRegionsAtom);
    const info = get(regionalVectorsInfoAtom);

    if (!baseName || !fipArray || regions.length === 0) return [];

    // Determine suffix from FIP array (FIPNUM → no suffix, FIPPLT → _PLT)
    const suffix = fipArray === "FIPNUM" ? "" : `_${fipArray.replace("FIP", "")}`;

    // Only include regions that actually exist for this FIP array
    const availableRegions = new Set(info.fipArrays[fipArray] ?? []);

    return regions.filter((r) => availableRegions.has(r)).map((r) => `${baseName}${suffix}:${r}`);
});
