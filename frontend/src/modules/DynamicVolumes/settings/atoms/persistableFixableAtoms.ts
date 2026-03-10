import { isEqual } from "lodash";

import type { EnsembleFipRegions } from "@framework/EnsembleFipRegions";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";

import { areFipMappingsCompatible } from "../../utils/fipCompatibility";
import type { RegionalVectorsInfo } from "../../utils/regionalVectors";
import { extractRegionalVectorsInfo } from "../../utils/regionalVectors";

import { vectorListQueriesAtom } from "./queryAtoms";

// ──────── Persistable / fixable atoms ────────

/** Multi-ensemble selection — array of RegularEnsembleIdent */
export const selectedEnsembleIdentsAtom = persistableFixableAtom<RegularEnsembleIdent[]>({
    initialValue: [],
    isValidFunction: ({ get, value }) => {
        if (value.length === 0) return false;
        const ensembleSet = get(EnsembleSetAtom);
        return value.every((ident) => ensembleSet.hasEnsemble(ident));
    },
    fixupFunction: ({ value, get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return fixupRegularEnsembleIdents(value ?? null, ensembleSet) ?? [];
    },
});

/** Selected base vector name, e.g. "ROIP" — auto-selects first available when invalid. */
export const selectedVectorBaseNameAtom = persistableFixableAtom<string | null, RegionalVectorsInfo>({
    initialValue: null,
    computeDependenciesState: computeVectorListDependenciesState,
    precomputeFunction: precomputeRegionalVectorsInfo,
    isValidFunction: ({ value, precomputedValue }) => {
        return value !== null && precomputedValue.vectorNames.includes(value);
    },
    fixupFunction: ({ precomputedValue }) => {
        return precomputedValue.vectorNames[0] ?? null;
    },
});

/** Selected FIP array, e.g. "FIPNUM" — auto-selects first available when invalid. */
export const selectedFipArrayAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    computeDependenciesState: computeVectorListDependenciesState,
    precomputeFunction: ({ get }) => {
        const info = precomputeRegionalVectorsInfo({ get });
        return Object.keys(info.fipArrays);
    },
    isValidFunction: ({ value, precomputedValue: fipArrayKeys }) => {
        return value !== null && fipArrayKeys.includes(value);
    },
    fixupFunction: ({ precomputedValue: fipArrayKeys }) => {
        return fipArrayKeys[0] ?? null;
    },
});

/** Selected FIPNUM region numbers — auto-selects all available regions when invalid. */
export const selectedRegionsAtom = persistableFixableAtom<number[], number[]>({
    initialValue: [],
    areEqualFunction: isEqual,
    computeDependenciesState: computeVectorListDependenciesState,
    precomputeFunction: ({ get }) => {
        const selectedFipArray = get(selectedFipArrayAtom);
        const info = precomputeRegionalVectorsInfo({ get });
        if (!selectedFipArray.value) return [];
        return info.fipArrays[selectedFipArray.value] ?? [];
    },
    isValidFunction: ({ value, precomputedValue: availableRegions }) => {
        return value.every((r) => availableRegions.includes(r));
    },
    fixupFunction: ({ value, precomputedValue: availableRegions }) => {
        const filtered = value?.filter((r) => availableRegions.includes(r)) ?? [];
        return filtered.length > 0 ? filtered : availableRegions;
    },
});

/** Selected zone names for zone/region selection mode — auto-selects all available when invalid. */
export const selectedZoneNamesAtom = persistableFixableAtom<string[], string[]>({
    initialValue: [],
    areEqualFunction: isEqual,
    precomputeFunction: ({ get }) => {
        const fipRegions = getValidatedFipRegions({ get });
        if (!fipRegions) return [];
        return fipRegions.getZones();
    },
    isValidFunction: ({ value, precomputedValue: availableZones }) => {
        return value.every((z) => availableZones.includes(z));
    },
    fixupFunction: ({ value, precomputedValue: availableZones }) => {
        const filtered = value?.filter((z) => availableZones.includes(z)) ?? [];
        return filtered.length > 0 ? filtered : availableZones;
    },
});

/** Selected region names for zone/region selection mode — auto-selects all available when invalid. */
export const selectedRegionNamesAtom = persistableFixableAtom<string[], string[]>({
    initialValue: [],
    areEqualFunction: isEqual,
    precomputeFunction: ({ get }) => {
        const fipRegions = getValidatedFipRegions({ get });
        if (!fipRegions) return [];
        return fipRegions.getRegions();
    },
    isValidFunction: ({ value, precomputedValue: availableRegions }) => {
        return value.every((r) => availableRegions.includes(r));
    },
    fixupFunction: ({ value, precomputedValue: availableRegions }) => {
        const filtered = value?.filter((r) => availableRegions.includes(r)) ?? [];
        return filtered.length > 0 ? filtered : availableRegions;
    },
});

/** Compute the dependencies state from the vector list queries atom. */
function computeVectorListDependenciesState({ get }: { get: (atom: any) => any }): "error" | "loading" | "loaded" {
    const queries = get(vectorListQueriesAtom);
    if (queries.some((q: any) => q.isFetching)) return "loading";
    if (queries.some((q: any) => q.isError)) return "error";
    return "loaded";
}

/**
 * Compute the RegionalVectorsInfo directly from the vector list query atom.
 * This avoids a circular dependency with derivedAtoms.ts.
 */
function precomputeRegionalVectorsInfo({ get }: { get: (atom: any) => any }): RegionalVectorsInfo {
    const queries = get(vectorListQueriesAtom);
    const loadedResults = queries.filter((q: any) => q.data != null);
    if (loadedResults.length === 0) return { vectorNames: [], fipArrays: {} };

    let intersection: Set<string> | null = null;
    for (const q of loadedResults) {
        const names = new Set<string>(q.data!.map((v: any) => v.name));
        if (intersection === null) {
            intersection = names;
        } else {
            for (const n of intersection) {
                if (!names.has(n)) intersection.delete(n);
            }
        }
    }

    return extractRegionalVectorsInfo(intersection ? [...intersection].sort() : []);
}

/**
 * Get the validated cross-ensemble FIP regions (null when missing or incompatible).
 * Replicates the check in ensembleFipRegionsAtom to avoid circular imports.
 */
function getValidatedFipRegions({ get }: { get: (atom: any) => any }): EnsembleFipRegions | null {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedIdents: RegularEnsembleIdent[] = get(selectedEnsembleIdentsAtom).value ?? [];
    if (selectedIdents.length === 0) return null;

    let reference: EnsembleFipRegions | null = null;
    for (const ident of selectedIdents) {
        const ensemble = ensembleSet.findEnsemble(ident);
        const fipRegions = ensemble?.getFipRegions?.() ?? null;
        if (!fipRegions) return null;
        if (reference === null) {
            reference = fipRegions;
        } else if (!areFipMappingsCompatible(reference, fipRegions)) {
            return null;
        }
    }
    return reference;
}
