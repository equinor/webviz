import { atom } from "jotai";

import {
    areSelectedIndicesWithValuesValidAtom,
    areSelectedTablesComparableAtom,
    areSourcesDistinctAtom,
    waterfallFactorSpecAtom,
    waterfallSourcesAtom,
} from "./baseAtoms";

export const isWaterfallComputableAtom = atom((get) => {
    return (
        get(areSourcesDistinctAtom) &&
        get(areSelectedTablesComparableAtom) &&
        get(areSelectedIndicesWithValuesValidAtom) &&
        get(waterfallFactorSpecAtom) !== null &&
        get(waterfallSourcesAtom) !== null
    );
});
