import { EnsembleSetAtom, ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";

import { atom } from "jotai";

import { userSelectedEnsembleIdentsAtom, userSelectedPvtNumsAtom, userSelectedRealizationsAtom } from "./baseAtoms";
import { pvtDataQueriesAtom } from "./queryAtoms";

import { PvtDataAccessor } from "../../utils/PvtDataAccessor";
import { computeRealizationsIntersection } from "../../utils/realizationsIntersection";

export const selectedEnsembleIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    let computedEnsembleIdents = userSelectedEnsembleIdents.filter((el) => ensembleSet.hasEnsemble(el));
    if (computedEnsembleIdents.length === 0 && ensembleSet.getEnsembleArray().length > 0) {
        computedEnsembleIdents = [ensembleSet.getEnsembleArray()[0].getIdent()];
    }

    return computedEnsembleIdents;
});

export const selectedRealizationsAtom = atom((get) => {
    const userSelectedRealizations = get(userSelectedRealizationsAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);
    const realizations = computeRealizationsIntersection(selectedEnsembleIdents, validEnsembleRealizationsFunction);

    let computedRealizations = userSelectedRealizations.filter((el) => realizations.includes(el));
    if (computedRealizations.length === 0 && realizations.length > 0) {
        computedRealizations = [realizations[0]];
    }

    return computedRealizations;
});

export const pvtDataAccessorAtom = atom((get) => {
    const pvtDataQueries = get(pvtDataQueriesAtom);
    if (pvtDataQueries.tableCollections.length === 0) {
        return new PvtDataAccessor([]);
    }

    const tableCollections = pvtDataQueries.tableCollections;

    return new PvtDataAccessor(tableCollections);
});

export const selectedPvtNumsAtom = atom<number[]>((get) => {
    const userSelectedPvtNums = get(userSelectedPvtNumsAtom);
    const pvtDataAccessor = get(pvtDataAccessorAtom);

    const uniquePvtNums = pvtDataAccessor.getUniquePvtNums();

    let computedPvtNums = userSelectedPvtNums.filter((el) => uniquePvtNums.includes(el));

    if (computedPvtNums.length === 0) {
        if (uniquePvtNums.length > 0) {
            computedPvtNums = [uniquePvtNums[0]];
        } else {
            computedPvtNums = [];
        }
    }

    return computedPvtNums;
});
