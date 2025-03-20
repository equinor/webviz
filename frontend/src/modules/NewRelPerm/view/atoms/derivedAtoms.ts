import { atom } from "jotai";

import { relPermSpecificationsAtom } from "./baseAtoms";
import { relPermRealizationDataQueryAtom, relPermStatisticalDataQueryAtom } from "./queryAtoms";

import { createLoadedRelPermSpecificationAndDataArray } from "../utils/relPermSpecificationsAndQueriesUtils";

export const loadedRelPermSpecificationsAndRealizationDataAtom = atom((get) => {
    const relPermDataQueries = get(relPermRealizationDataQueryAtom);
    const relPermSpecifications = get(relPermSpecificationsAtom);

    return createLoadedRelPermSpecificationAndDataArray(relPermSpecifications, relPermDataQueries);
});

export const loadedRelPermSpecificationsAndStatisticalDataAtom = atom((get) => {
    const relPermDataQueries = get(relPermStatisticalDataQueryAtom);
    const relPermSpecifications = get(relPermSpecificationsAtom);

    return createLoadedRelPermSpecificationAndDataArray(relPermSpecifications, relPermDataQueries);
});
