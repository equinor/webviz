import { atom } from "jotai";

import { createLoadedRelPermSpecificationAndDataArray } from "../utils/relPermSpecificationsAndQueriesUtils";

import { relPermSpecificationsAtom } from "./baseAtoms";
import { relPermRealizationDataQueryAtom, relPermStatisticalDataQueryAtom } from "./queryAtoms";


export const loadedRelPermSpecificationsAndRealizationDataAtom = atom((get) => {
    const relPermDataQueries = get(relPermRealizationDataQueryAtom);
    const relPermSpecifications = get(relPermSpecificationsAtom);
    return createLoadedRelPermSpecificationAndDataArray(relPermSpecifications, relPermDataQueries);
});

export const realizationQueryIsFetchingAtom = atom((get) => {
    const relPermRealizationDataQueries = get(relPermRealizationDataQueryAtom);
    const realizationDataIsFetching = relPermRealizationDataQueries.some((query) => query.isFetching);

    return realizationDataIsFetching;
});
export const realizationsQueryHasErrorAtom = atom((get) => {
    const realizationDataQueries = get(relPermRealizationDataQueryAtom);

    return realizationDataQueries.some((query) => query.isError);
});

export const loadedRelPermSpecificationsAndStatisticalDataAtom = atom((get) => {
    const relPermStatisticalDataQueries = get(relPermStatisticalDataQueryAtom);
    const relPermSpecifications = get(relPermSpecificationsAtom);
    return createLoadedRelPermSpecificationAndDataArray(relPermSpecifications, relPermStatisticalDataQueries);
});
export const statisticsQueryIsFetchingAtom = atom((get) => {
    const relPermStatisticalDataQueries = get(relPermStatisticalDataQueryAtom);
    const statisticsDataIsFetching = relPermStatisticalDataQueries.some((query) => query.isFetching);

    return statisticsDataIsFetching;
});
export const statisticsQueryHasErrorAtom = atom((get) => {
    const statisticsDataQueries = get(relPermStatisticalDataQueryAtom);

    return statisticsDataQueries.some((query) => query.isError);
});
