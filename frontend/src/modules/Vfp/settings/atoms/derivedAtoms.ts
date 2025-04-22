import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { fixupRegularEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import { isProdTable } from "@modules/Vfp/utils/vfpTableClassifier";

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

export const selectedEnsembleIdentAtom = atom<RegularEnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    const validEnsembleIdent = fixupRegularEnsembleIdent(userSelectedEnsembleIdent, ensembleSet);
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
    const thp_values = vfpTable?.thpValues ?? [];
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
    const userSelectedWfrIndicies = get(userSelectedWfrIndicesAtom);
    if (vfpTable === undefined) {
        return null;
    }
    if (!isProdTable(vfpTable)) {
        return null;
    }
    const wfr_values = vfpTable.wfrValues ?? [];
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
    const userSelectedGfrIndicies = get(userSelectedGfrIndicesAtom);
    if (vfpTable === undefined) {
        return null;
    }
    if (!isProdTable(vfpTable)) {
        return null;
    }
    const gfr_values = vfpTable.gfrValues ?? [];
    if (gfr_values.length === 0) {
        return null;
    }
    if (!userSelectedGfrIndicies) {
        return [0];
    }
    return userSelectedGfrIndicies;
});

export const selectedAlqIndicesAtom = atom<number[] | null>((get) => {
    const vfpTable = get(vfpTableQueryAtom).data;
    const userSelectedAlqIndicies = get(userSelectedAlqIndicesAtom);
    if (vfpTable === undefined) {
        return null;
    }
    if (!isProdTable(vfpTable)) {
        return null;
    }
    const alq_values = vfpTable.alqValues ?? [];
    if (alq_values.length === 0) {
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
    const vfpTable = get(vfpTableQueryAtom).data;
    const userSelectedColorBy = get(userSelectedColorByAtom);
    if (vfpTable === undefined) {
        return VfpParam.THP;
    }
    if (userSelectedColorBy === null) {
        return VfpParam.THP;
    }
    if (!isProdTable(vfpTable) && ["WFR", "GFR", "ALQ"].includes(userSelectedColorBy)) {
        return VfpParam.THP;
    }
    return userSelectedColorBy;
});
