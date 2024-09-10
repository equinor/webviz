import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdent } from "@framework/utils/ensembleUiHelpers";

import { atom } from "jotai";

import {
    userSelectedAlqIndicesAtom,
    userSelectedColorByAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedGfrIndicesAtom,
    userSelectedPressureOptionAtom,
    userSelectedRealizationNumberAtom,
    userSelectedThpIndicesAtom,
    userSelectedVfpTableNameAtom,
    userSelectedWfrIndicesAtom,
    validRealizationNumbersAtom,
} from "./baseAtoms";
import { vfpTableNamesQueryAtom, vfpTableQueryAtom } from "./queryAtoms";

import { PressureOption, VfpParam } from "../../types";

export const vfpTableNamesQueryResultAtom = atom((get) => {
    return get(vfpTableNamesQueryAtom);
});

export const availableVfpTableNamesAtom = atom<string[]>((get) => {
    const vfpTableNamesQueryResult = get(vfpTableNamesQueryAtom);
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

export const selectedVfpTableNameAtom = atom<string | null>((get) => {
    const userSelectedVfpTableName = get(userSelectedVfpTableNameAtom);
    const validVfpTableNames = get(availableVfpTableNamesAtom);

    if (validVfpTableNames.length === 0) {
        return null;
    }

    if (userSelectedVfpTableName === null) {
        const firstVfpTableName = validVfpTableNames.length > 0 ? validVfpTableNames[0] : null;
        return firstVfpTableName;
    }

    const validVfpTableName = validVfpTableNames.includes(userSelectedVfpTableName) ? userSelectedVfpTableName : null;
    return validVfpTableName;
});

export const selectedThpIndicesAtom = atom<number[] | null>((get) => {
    const vfpTable = get(vfpTableQueryAtom).data;
    const thp_values = vfpTable?.thp_values ?? [];
    const userSelectedThpIndicies = get(userSelectedThpIndicesAtom);

    if (thp_values.length === 0) {
        return null;
    }
    if (!userSelectedThpIndicies) {
        return [0];
    }

    return userSelectedThpIndicies;
});

export const selectedWfrIndicesAtom = atom<number[] | null>((get) => {
    const vfpTable = get(vfpTableQueryAtom).data;
    const wfr_values = vfpTable?.wfr_values ?? [];
    const userSelectedWfrIndicies = get(userSelectedWfrIndicesAtom);

    if (wfr_values.length === 0) {
        return null;
    }
    if (!userSelectedWfrIndicies) {
        return [0];
    }

    return userSelectedWfrIndicies;
});

export const selectedGfrIndicesAtom = atom<number[] | null>((get) => {
    const vfpTable = get(vfpTableQueryAtom).data;
    const wfr_values = vfpTable?.gfr_values ?? [];
    const userSelectedGfrIndicies = get(userSelectedGfrIndicesAtom);

    if (wfr_values.length === 0) {
        return null;
    }
    if (!userSelectedGfrIndicies) {
        return [0];
    }

    return userSelectedGfrIndicies;
});

export const selectedAlqIndicesAtom = atom<number[] | null>((get) => {
    const vfpTable = get(vfpTableQueryAtom).data;
    const wfr_values = vfpTable?.alq_values ?? [];
    const userSelectedAlqIndicies = get(userSelectedAlqIndicesAtom);

    if (wfr_values.length === 0) {
        return null;
    }
    if (!userSelectedAlqIndicies) {
        return [0];
    }

    return userSelectedAlqIndicies;
});

export const selectedPressureOptionAtom = atom<PressureOption>((get) => {
    const userSelectedPressureOption = get(userSelectedPressureOptionAtom);

    if (userSelectedPressureOption === null) {
        return PressureOption.BHP;
    }
    return userSelectedPressureOption;
});

export const selectedColorByAtom = atom<VfpParam>((get) => {
    const userSelectedColorBy = get(userSelectedColorByAtom);

    if (userSelectedColorBy === null) {
        return VfpParam.THP
    }
    return userSelectedColorBy
});
