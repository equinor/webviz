import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { fixupEnsembleIdent, fixupRegularEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import { RelPermSpec } from "@modules/RelPerm/typesAndEnums";

import { atom } from "jotai";

import {
    userSelectedEnsembleIdentAtom,
    userSelectedRelPermCurveNamesAtom,
    userSelectedSatNumsAtom,
    userSelectedSaturationAxisAtom,
    userSelectedTableNameAtom,
} from "./baseAtoms";
import { relPermTableInfoQueryAtom, relPermTableNamesQueryAtom } from "./queryAtoms";

function fixupSelectedOrFirstValue<T extends string | number>(selectedValue: T | null, values: T[]): T | null {
    const includes = (value: T | null): value is T => {
        return value !== null && values.includes(value);
    };

    if (includes(selectedValue)) {
        return selectedValue;
    }
    if (values.length) {
        return values[0];
    }
    return null;
}

export const selectedEnsembleIdentAtom = atom<RegularEnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    const validEnsembleIdent = fixupRegularEnsembleIdent(userSelectedEnsembleIdent, ensembleSet);
    return validEnsembleIdent;
});

export const availableRelPermTableNamesAtom = atom<string[]>((get) => {
    const tableNames = get(relPermTableNamesQueryAtom).data;
    return tableNames ?? [];
});
export const selectedRelPermTableNameAtom = atom<string | null>((get) => {
    const availableRelPermTableNames = get(availableRelPermTableNamesAtom);
    const userSelectedTableName = get(userSelectedTableNameAtom);
    return fixupSelectedOrFirstValue(userSelectedTableName, availableRelPermTableNames);
});

export const availableRelPermSaturationAxesAtom = atom<string[]>((get) => {
    const tableInfo = get(relPermTableInfoQueryAtom).data;
    if (!tableInfo) {
        return [];
    }
    return tableInfo.saturation_axes.map((axis) => axis.saturation_name);
});

export const selectedRelPermSaturationAxisAtom = atom<string | null>((get) => {
    const availableSaturationAxes = get(availableRelPermSaturationAxesAtom);
    const userSelectedSaturationAxis = get(userSelectedSaturationAxisAtom);
    return fixupSelectedOrFirstValue(userSelectedSaturationAxis, availableSaturationAxes);
});

export const availableRelPermCurveNamesAtom = atom<string[]>((get) => {
    const tableInfo = get(relPermTableInfoQueryAtom).data;
    if (!tableInfo) {
        return [];
    }
    const selectedSaturationAxis = get(selectedRelPermSaturationAxisAtom);
    const selectedSaturationAxisInfo = tableInfo.saturation_axes.find(
        (axis) => axis.saturation_name === selectedSaturationAxis
    );
    return selectedSaturationAxisInfo?.relperm_curve_names ?? [];
});

export const selectedRelPermCurveNamesAtom = atom<string[] | null>((get) => {
    const availableRelPermCurveNames = get(availableRelPermCurveNamesAtom);
    const userSelectedRelPermCurveNames = get(userSelectedRelPermCurveNamesAtom);
    let computedRelPermCurveNames = userSelectedRelPermCurveNames?.filter((name) =>
        availableRelPermCurveNames.includes(name)
    );
    if (!computedRelPermCurveNames || computedRelPermCurveNames.length === 0) {
        computedRelPermCurveNames = availableRelPermCurveNames;
    }
    return computedRelPermCurveNames;
});

export const availableSatNumsAtom = atom<number[]>((get) => {
    const tableInfo = get(relPermTableInfoQueryAtom).data;
    if (!tableInfo) {
        return [];
    }

    return tableInfo.satnums;
});

export const selectedSatNumsAtom = atom<number[]>((get) => {
    const availableSatNums = get(availableSatNumsAtom);
    const userSelectedSatNums = get(userSelectedSatNumsAtom);

    let computedSatNums = userSelectedSatNums.filter((el) => availableSatNums.includes(el));

    if (computedSatNums.length === 0) {
        if (availableSatNums.length > 0) {
            computedSatNums = [availableSatNums[0]];
        } else {
            computedSatNums = [];
        }
    }

    return computedSatNums;
});

export const relPermSpecificationsAtom = atom<RelPermSpec[]>((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom);
    const selectedCurveNames = get(selectedRelPermCurveNamesAtom);
    const selectedSatNums = get(selectedSatNumsAtom);
    const selectedSaturationAxisName = get(selectedRelPermSaturationAxisAtom);
    const selectedTableName = get(selectedRelPermTableNameAtom);

    const specifications: RelPermSpec[] = [];

    // for (const vectorName of selectedVectorNames) {
    //     if (!ensembleVectorListsHelper.isVectorInEnsemble(ensembleIdent, vectorName)) {
    //         continue;
    //     }
    if (ensembleIdent && selectedTableName && selectedSaturationAxisName && selectedCurveNames) {
        for (const satNum of selectedSatNums) {
            specifications.push({
                ensembleIdent,
                tableName: selectedTableName,
                saturationAxisName: selectedSaturationAxisName,
                curveNames: selectedCurveNames,
                satNum: satNum,
            });
        }
    }
    return specifications;
});
