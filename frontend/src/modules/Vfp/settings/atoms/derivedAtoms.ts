import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdent } from "@framework/utils/ensembleUiHelpers";

import { atom } from "jotai";

import {
    userSelectedEnsembleIdentAtom,
    userSelectedRealizationNumberAtom,
    validRealizationNumbersAtom,
    userSelectedVfpTableNameAtom,
    validVfpTableNamesAtom,
} from "./baseAtoms";

import { vfpTableNamesQueryAtom } from "./queryAtoms";

import { QueryStatus } from "../../types";

export const vfpTableNamesQueryResultAtom = atom((get) => {
    return get(vfpTableNamesQueryAtom);
});

export const availableVfpTableNamesAtom = atom<string[]>((get) => {
    const vfpTableNamesQueryResult = get(vfpTableNamesQueryAtom)
    return vfpTableNamesQueryResult.data?.map((item) => item) ?? [];
});

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

export const selectedVfpTableNameAtom = atom<string | null> ((get) => {
    const userSelectedVfpTableName = get(userSelectedVfpTableNameAtom)
    const validVfpTableNames = get(validVfpTableNamesAtom)

    if(!validVfpTableNames) {
        return null;
    }

    if (userSelectedVfpTableName === null) {
        const firstVfpTableName = validVfpTableNames.length > 0 ? validVfpTableNames[0] : null
        return firstVfpTableName
    }

    const validVfpTableName = validVfpTableNames.includes(userSelectedVfpTableName)
        ? userSelectedVfpTableName
        : null;
    return validVfpTableName
});
