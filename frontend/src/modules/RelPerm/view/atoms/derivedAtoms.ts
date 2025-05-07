import { atom } from "jotai";

import { relPermSpecificationsAtom } from "./baseAtoms";
import { relPermRealizationDataQueryAtom } from "./queryAtoms";

import { createLoadedRelPermSpecificationAndDataArray } from "../utils/relPermSpecificationsAndQueriesUtils";

export const loadedRelPermSpecificationsAndRealizationDataAtom = atom((get) => {
    const relPermDataQueries = get(relPermRealizationDataQueryAtom);
    const relPermSpecifications = get(relPermSpecificationsAtom);

    return createLoadedRelPermSpecificationAndDataArray(relPermSpecifications, relPermDataQueries);
});
