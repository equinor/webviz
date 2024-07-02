import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdent } from "@framework/utils/ensembleUiHelpers";

import { atom } from "jotai";

import {
    userSelectedEnsembleIdentAtom,
    userSelectedRealizationNumberAtom,
    validRealizationNumbersAtom,
} from "./baseAtoms";

import { QueryStatus } from "../../types";

export const selectedEnsembleIdentAtom = atom<EnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    const validEnsembleIdent = fixupEnsembleIdent(userSelectedEnsembleIdent, ensembleSet);
    return validEnsembleIdent;
});

export const selectedRealizationNumberAtom = atom<number | null>((get) => {
    const userSelectedRealizationNumber = get(userSelectedRealizationNumberAtom);
    const validRealizationNumbers = get(validRealizationNumbersAtom);

    if (!validRealizationNumbers) {
        return null;
    }

    if (userSelectedRealizationNumber === null) {
        const firstRealization = validRealizationNumbers.length > 0 ? validRealizationNumbers[0] : null;
        return firstRealization;
    }

    const validRealizationNumber = validRealizationNumbers.includes(userSelectedRealizationNumber)
        ? userSelectedRealizationNumber
        : null;
    return validRealizationNumber;
});
