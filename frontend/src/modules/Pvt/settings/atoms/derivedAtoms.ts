import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleRealizationFilterFunctionAtom, EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atom } from "jotai";

import { userSelectedEnsembleIdentsAtom, userSelectedPvtNumsAtom, userSelectedRealizationsAtom } from "./baseAtoms";
import { pvtDataQueriesAtom } from "./queryAtoms";

import { PvtDataAccessor } from "../../utils/PvtDataAccessor";
import { computeRealizationsIntersection } from "../../utils/realizationsIntersection";

export const selectedEnsembleIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    let computedEnsembleIdents = userSelectedEnsembleIdents.filter((el) => ensembleSet.hasEnsemble(el));
    if (computedEnsembleIdents.length === 0 && ensembleSet.getEnsembleArr().length > 0) {
        computedEnsembleIdents = [ensembleSet.getEnsembleArr()[0].getIdent()];
    }

    return computedEnsembleIdents;
});

export const selectedRealizationsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedRealizations = get(userSelectedRealizationsAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    let ensembleRealizationFilterFunction = get(EnsembleRealizationFilterFunctionAtom);

    if (ensembleRealizationFilterFunction === null) {
        ensembleRealizationFilterFunction = (ensembleIdent: EnsembleIdent) => {
            return ensembleSet.findEnsemble(ensembleIdent)?.getRealizations() ?? [];
        };
    }

    const realizations = computeRealizationsIntersection(selectedEnsembleIdents, ensembleRealizationFilterFunction);

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
