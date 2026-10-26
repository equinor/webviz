import { atom } from "jotai";

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
import { selectedEnsembleIdentsAtom, selectedSaturationAxisNameAtom, selectedSatnumsAtom } from "./persistableFixableAtoms";
import {
    relPermRealizationDataQueriesAtom,
    relPermTableDefinitionQueriesAtom,
    relPermTableNamesQueriesAtom,
} from "./queryAtoms";

function intersectArrays<T>(arrays: T[][]): T[] {
    if (arrays.length === 0) {
        return [];
    }

    return arrays.reduce<T[]>((intersection, currentArray) => {
        return intersection.filter((value) => currentArray.includes(value));
    }, arrays[0]);
}

export const availableTableNamesAtom = atom<string[]>((get) => {
    const tableNameQueries = get(relPermTableNamesQueriesAtom);
    const loadedTableNames = tableNameQueries.flatMap((query) => (query.data ? [query.data] : []));

    return intersectArrays(loadedTableNames);
});

export const ensembleTableDefinitionsAtom = atom<RelPermEnsembleTableDefinition[]>((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value;
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

export const availableCurveNamesAtom = atom<string[]>((get) => {
    const tableDefinitions = get(ensembleTableDefinitionsAtom);
    const selectedSaturationAxisName = get(selectedSaturationAxisNameAtom).value;
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

export const availableSatnumsAtom = atom<number[]>((get) => {
    const tableDefinitions = get(ensembleTableDefinitionsAtom);
    const satnumsPerDefinition = tableDefinitions.map((definition) => definition.tableDefinition.satnums);

    return intersectArrays(satnumsPerDefinition);
});

export const relPermDataAccessorStatusAtom = atom((get) => get(relPermRealizationDataQueriesAtom));

export const visualizationSettingsAtom = atom((get) => {
    const selectedGroupBy = get(selectedGroupByAtom);
    const shouldForceSatnumColor = get(selectedSatnumsAtom).value.length > 1 && selectedGroupBy !== GroupBy.SATNUM;

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
