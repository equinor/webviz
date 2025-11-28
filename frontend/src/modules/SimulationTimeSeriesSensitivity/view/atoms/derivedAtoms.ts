import { atom } from "jotai";

import {
    historicalVectorDataQueryAtom,
    statisticalVectorSensitivityDataQueryAtom,
    vectorDataQueryAtom,
} from "./queryAtoms";

export const queryIsFetchingAtom = atom((get) => {
    const vectorDataQuery = get(vectorDataQueryAtom);
    const statisticalVectorSensitivityDataQuery = get(statisticalVectorSensitivityDataQueryAtom);
    const historicalVectorDataQuery = get(historicalVectorDataQueryAtom);

    return (
        vectorDataQuery.isFetching ||
        statisticalVectorSensitivityDataQuery.isFetching ||
        historicalVectorDataQuery.isFetching
    );
});
