import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import type { RelPermSpec } from "@modules/RelPerm/typesAndEnums";

import { atom } from "jotai";

import {
    selectedCurveTypeAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedRelPermCurveNamesAtom,
    userSelectedSatNumsAtom,
    userSelectedSaturationAxisAtom,
    userSelectedTableNameAtom,
} from "./baseAtoms";
import { relPermTableInfoQueriesAtom, relPermTableNamesQueriesAtom } from "./queryAtoms";

import { relPermTablesInfoHelper } from "../utils/relPermTableInfoHelper";

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

export const selectedEnsembleIdentsAtom = atom<RegularEnsembleIdent[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    const newSelectedEnsembleIdents = userSelectedEnsembleIdents.filter((ensemble) =>
        ensembleSet.hasEnsemble(ensemble),
    );
    const validatedEnsembleIdents = fixupRegularEnsembleIdents(newSelectedEnsembleIdents, ensembleSet);

    return validatedEnsembleIdents ?? [];
});

export const availableRelPermTableNamesAtom = atom<string[]>((get) => {
    const tableNamesQueries = get(relPermTableNamesQueriesAtom);
    if (tableNamesQueries.some((query) => query.isFetching)) {
        return [];
    }

    return tableNamesQueries.reduce<string[]>((acc, query) => {
        return query.data ? acc.filter((name) => query.data.includes(name)) : acc;
    }, tableNamesQueries[0].data ?? []);
});

export const selectedRelPermTableNameAtom = atom<string | null>((get) => {
    const availableRelPermTableNames = get(availableRelPermTableNamesAtom);
    const userSelectedTableName = get(userSelectedTableNameAtom);
    return fixupSelectedOrFirstValue(userSelectedTableName, availableRelPermTableNames);
});

export const relPermTablesInfoHelperAtom = atom<relPermTablesInfoHelper>((get) => {
    const tableInfoQueries = get(relPermTableInfoQueriesAtom);
    const selectedCurveType = get(selectedCurveTypeAtom);
    return new relPermTablesInfoHelper(tableInfoQueries, selectedCurveType);
});
export const availableRelPermSaturationAxesAtom = atom<string[]>((get) => {
    const relPermTablesInfoHelper = get(relPermTablesInfoHelperAtom);
    return relPermTablesInfoHelper.saturationNamesIntersection();
});

export const selectedRelPermSaturationAxisAtom = atom<string | null>((get) => {
    const availableSaturationAxes = get(availableRelPermSaturationAxesAtom);
    const userSelectedSaturationAxis = get(userSelectedSaturationAxisAtom);
    return fixupSelectedOrFirstValue(userSelectedSaturationAxis, availableSaturationAxes);
});

export const availableRelPermCurveNamesAtom = atom<string[]>((get) => {
    const relPermTablesInfoHelper = get(relPermTablesInfoHelperAtom);
    const selectedSaturationAxis = get(selectedRelPermSaturationAxisAtom);
    return relPermTablesInfoHelper.curveNamesForSaturationAxisIntersection(selectedSaturationAxis);
});

export const selectedRelPermCurveNamesAtom = atom<string[] | null>((get) => {
    const availableRelPermCurveNames = get(availableRelPermCurveNamesAtom);
    const userSelectedRelPermCurveNames = get(userSelectedRelPermCurveNamesAtom);
    let computedRelPermCurveNames = userSelectedRelPermCurveNames?.filter((name) =>
        availableRelPermCurveNames.includes(name),
    );
    if (!computedRelPermCurveNames || computedRelPermCurveNames.length === 0) {
        computedRelPermCurveNames = availableRelPermCurveNames;
    }
    return computedRelPermCurveNames;
});

export const availableSatNumsAtom = atom<number[]>((get) => {
    const relPermTablesInfoHelper = get(relPermTablesInfoHelperAtom);
    return relPermTablesInfoHelper.satNumsIntersection();
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
    const ensembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedCurveNames = get(selectedRelPermCurveNamesAtom);
    const selectedSatNums = get(selectedSatNumsAtom);
    const selectedSaturationAxisName = get(selectedRelPermSaturationAxisAtom);
    const selectedTableName = get(selectedRelPermTableNameAtom);

    const specifications: RelPermSpec[] = [];

    if (ensembleIdents.length && selectedTableName && selectedSaturationAxisName && selectedCurveNames) {
        for (const ensembleIdent of ensembleIdents) {
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
    }
    return specifications;
});
