import { atom } from "jotai";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";

import { ColorBy, CurveType, GroupBy, type RelPermEnsembleTableDefinition } from "../../typesAndEnums";

import {
    selectedColorByAtom,
    selectedCurveTypeAtom,
    selectedGroupByAtom,
    selectedStatisticsAtom,
    selectedYAxisScaleAtom,
    showIndividualRealizationsAtom,
    showStatisticalFanAtom,
    showStatisticalLinesAtom,
} from "./baseAtoms";
import {
    userSelectedCurveNamesAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedSaturationAxisNameAtom,
    userSelectedSatnumsAtom,
    userSelectedTableNameAtom,
} from "./persistableFixableAtoms";
import {
    relPermRealizationDataQueriesAtom,
    relPermTableDefinitionQueriesAtom,
    relPermTableNamesQueriesAtom,
} from "./queryAtoms";

function fixupSelectedOrFirstValue<T extends string | number>(selectedValue: T | null, values: T[]): T | null {
    if (selectedValue !== null && values.includes(selectedValue)) {
        return selectedValue;
    }

    return values[0] ?? null;
}

function intersectArrays<T>(arrays: T[][]): T[] {
    if (arrays.length === 0) {
        return [];
    }

    return arrays.reduce<T[]>((intersection, currentArray) => {
        return intersection.filter((value) => currentArray.includes(value));
    }, arrays[0]);
}

export const selectedEnsembleIdentsAtom = atom<RegularEnsembleIdent[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom).value;

    return fixupRegularEnsembleIdents(userSelectedEnsembleIdents, ensembleSet) ?? [];
});

export const availableTableNamesAtom = atom<string[]>((get) => {
    const tableNameQueries = get(relPermTableNamesQueriesAtom);
    const loadedTableNames = tableNameQueries.flatMap((query) => (query.data ? [query.data] : []));

    return intersectArrays(loadedTableNames);
});

export const selectedTableNameAtom = atom<string | null>((get) => {
    return fixupSelectedOrFirstValue(get(userSelectedTableNameAtom).value, get(availableTableNamesAtom));
});

export const ensembleTableDefinitionsAtom = atom<RelPermEnsembleTableDefinition[]>((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const tableDefinitionQueries = get(relPermTableDefinitionQueriesAtom);

    return tableDefinitionQueries.flatMap((queryResult, index) => {
        if (!queryResult.data) {
            return [];
        }

        return [{ ensembleIdent: selectedEnsembleIdents[index], tableDefinition: queryResult.data }];
    });
});

export const availableSaturationAxisNamesAtom = atom<string[]>((get) => {
    const tableDefinitions = get(ensembleTableDefinitionsAtom);
    const axisNamesPerDefinition = tableDefinitions.map((definition) => {
        return definition.tableDefinition.saturation_axes.map((axis) => axis.saturation_name);
    });

    return intersectArrays(axisNamesPerDefinition);
});

export const selectedSaturationAxisNameAtom = atom<string | null>((get) => {
    return fixupSelectedOrFirstValue(
        get(userSelectedSaturationAxisNameAtom).value,
        get(availableSaturationAxisNamesAtom),
    );
});

export const availableCurveNamesAtom = atom<string[]>((get) => {
    const tableDefinitions = get(ensembleTableDefinitionsAtom);
    const selectedSaturationAxisName = get(selectedSaturationAxisNameAtom);
    const selectedCurveType = get(selectedCurveTypeAtom);

    if (!selectedSaturationAxisName) {
        return [];
    }

    const curveNamesPerDefinition = tableDefinitions.map((definition) => {
        const saturationAxis = definition.tableDefinition.saturation_axes.find(
            (axis) => axis.saturation_name === selectedSaturationAxisName,
        );

        if (!saturationAxis) {
            return [];
        }

        return selectedCurveType === CurveType.RELPERM
            ? saturationAxis.relperm_curve_names
            : saturationAxis.capillary_pressure_curve_names;
    });

    return intersectArrays(curveNamesPerDefinition);
});

export const selectedCurveNamesAtom = atom<string[]>((get) => {
    const availableCurveNames = get(availableCurveNamesAtom);
    const userSelectedCurveNames = get(userSelectedCurveNamesAtom).value;
    const selectedCurveNames = userSelectedCurveNames.filter((curveName) => availableCurveNames.includes(curveName));

    return selectedCurveNames.length > 0 ? selectedCurveNames : availableCurveNames;
});

export const availableSatnumsAtom = atom<number[]>((get) => {
    const tableDefinitions = get(ensembleTableDefinitionsAtom);
    const satnumsPerDefinition = tableDefinitions.map((definition) => definition.tableDefinition.satnums);

    return intersectArrays(satnumsPerDefinition);
});

export const selectedSatnumsAtom = atom<number[]>((get) => {
    const availableSatnums = get(availableSatnumsAtom);
    const userSelectedSatnums = get(userSelectedSatnumsAtom).value;
    const selectedSatnums = userSelectedSatnums.filter((satnum) => availableSatnums.includes(satnum));

    return selectedSatnums.length > 0 ? selectedSatnums : availableSatnums.slice(0, 1);
});

export const relPermDataAccessorStatusAtom = atom((get) => get(relPermRealizationDataQueriesAtom));

export const visualizationSettingsAtom = atom((get) => {
    const selectedGroupBy = get(selectedGroupByAtom);
    const shouldForceSatnumColor = get(selectedSatnumsAtom).length > 1 && selectedGroupBy !== GroupBy.SATNUM;

    return {
        showIndividualRealizations: get(showIndividualRealizationsAtom),
        showStatisticalLines: get(showStatisticalLinesAtom),
        showStatisticalFan: get(showStatisticalFanAtom),
        selectedStatistics: get(selectedStatisticsAtom),
        colorBy: shouldForceSatnumColor ? ColorBy.SATNUM : get(selectedColorByAtom),
        groupBy: selectedGroupBy,
        yAxisScale: get(selectedYAxisScaleAtom),
    };
});
