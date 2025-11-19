import { atom } from "jotai";

import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import type { PvtDataAccessorWithStatus } from "@modules/Pvt/typesAndEnums";

import { PvtDataAccessor } from "../../utils/PvtDataAccessor";
import { computeRealizationsIntersection } from "../../utils/realizationsIntersection";

import { selectedEnsembleIdentsAtom } from "./persistableFixableAtoms";
import { pvtDataQueriesAtom } from "./queryAtoms";

export const availableRealizationNumbersAtom = atom((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value;
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    return computeRealizationsIntersection(selectedEnsembleIdents, validEnsembleRealizationsFunction);
});

export const pvtDataAccessorWithStatusAtom = atom<PvtDataAccessorWithStatus>((get) => {
    const pvtDataQueries = get(pvtDataQueriesAtom);

    const pvtDataAccessor =
        pvtDataQueries.tableCollections.length > 0 ? new PvtDataAccessor(pvtDataQueries.tableCollections) : null;

    return {
        pvtDataAccessor: pvtDataAccessor,
        isFetching: pvtDataQueries.isFetching,
        allQueriesFailed: pvtDataQueries.allQueriesFailed,
    };
});
