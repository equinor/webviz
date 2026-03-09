import { atom } from "jotai";

import type { VectorGroupDef } from "../../utils/vectorGroups";
import { computeVectorGroupDefs } from "../../utils/vectorGroups";

import {
    colorByAtom,
    fipRegionLabelsAtom,
    selectedRegionsAtom,
    subplotByAtom,
    vectorNamesToFetchAtom,
} from "./baseAtoms";
import { groupedVectorDataQueriesAtom } from "./queryAtoms";

/**
 * Derived atom that computes the vector groups to request from the backend
 * based on the current colorBy/subplotBy dimension configuration.
 *
 * These groups determine how FIP region vectors are summed server-side.
 * The groups are identical for every ensemble.
 */
export const vectorGroupDefsAtom = atom<VectorGroupDef[]>((get) => {
    const selectedRegions = get(selectedRegionsAtom);
    const fipRegionLabels = get(fipRegionLabelsAtom);
    const colorBy = get(colorByAtom);
    const subplotBy = get(subplotByAtom);
    const vectorNamesToFetch = get(vectorNamesToFetchAtom);

    if (!colorBy) return [];

    return computeVectorGroupDefs(selectedRegions, fipRegionLabels, colorBy, subplotBy, vectorNamesToFetch);
});

export const isDataFetchingAtom = atom<boolean>((get) => {
    const queries = get(groupedVectorDataQueriesAtom);
    return queries.some((q) => q.isFetching);
});

export const allQueriesFailedAtom = atom<boolean>((get) => {
    const queries = get(groupedVectorDataQueriesAtom);
    return queries.length > 0 && queries.every((q) => q.isError);
});
