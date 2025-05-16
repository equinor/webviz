import { atom } from "jotai";

import { relPermSpecificationsAtom } from "./baseAtoms";
import { relPermRealizationDataQueryAtom } from "./queryAtoms";

import { createLoadedRelPermSpecificationAndDataArray } from "../utils/relPermSpecificationsAndQueriesUtils";

export const loadedRelPermSpecificationsAndRealizationDataAtom = atom((get) => {
    const relPermDataQueries = get(relPermRealizationDataQueryAtom);
    const relPermSpecifications = get(relPermSpecificationsAtom);

    return createLoadedRelPermSpecificationAndDataArray(relPermSpecifications, relPermDataQueries);
});

export const queryIsFetchingAtom = atom((get) => {
    const relPermRealizationDataQueries = get(relPermRealizationDataQueryAtom);
    const realizationDataIsFetching = relPermRealizationDataQueries.some((query) => query.isFetching);

    return realizationDataIsFetching;
});
export const realizationsQueryHasErrorAtom = atom((get) => {
    const realizationDataQueries = get(relPermRealizationDataQueryAtom);

    return realizationDataQueries.some((query) => query.isError);
});
