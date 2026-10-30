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
    selectedEnsembleIdentsAtom,
    selectedSaturationAxisNameAtom,
    selectedSatnumsAtom,
    selectedTableNameAtom,
} from "./persistableFixableAtoms";
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

// Disabled queries keep their cached data, so options must not be derived from them while the selections they
// depend on are invalid - otherwise stale options are listed next to "No valid value until another invalid setting is fixed."
export const availableTableNamesAtom = atom<string[]>((get) => {
    if (!get(selectedEnsembleIdentsAtom).isValidInContext) {
        return [];
    }

    const tableNameQueries = get(relPermTableNamesQueriesAtom);
    const loadedTableNames = tableNameQueries.flatMap((query) => (query.data ? [query.data] : []));

    return intersectArrays(loadedTableNames);
});

function arraysHaveSameValues(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
        return false;
    }

    const sortedLeft = [...left].sort();
    const sortedRight = [...right].sort();
    return sortedLeft.every((value, index) => value === sortedRight[index]);
}

export const tableNameSetsDifferAtom = atom<boolean>((get) => {
    const loadedTableNameSets = get(relPermTableNamesQueriesAtom).flatMap((query) => (query.data ? [query.data] : []));

    return (
        loadedTableNameSets.length > 1 &&
        loadedTableNameSets.some((tableNames) => !arraysHaveSameValues(tableNames, loadedTableNameSets[0]))
    );
});

export const commonTableNamesAreMissingAtom = atom<boolean>((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value;
    const tableNameQueries = get(relPermTableNamesQueriesAtom);
    const loadedTableNameSets = tableNameQueries.filter((query) => query.data);
    const allTableNameQueriesLoaded =
        selectedEnsembleIdents.length > 0 &&
        tableNameQueries.every((query) => query.data !== undefined || query.isError);

    return allTableNameQueriesLoaded && loadedTableNameSets.length > 1 && get(availableTableNamesAtom).length === 0;
});

export const ensembleTableDefinitionsAtom = atom<RelPermEnsembleTableDefinition[]>((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value;
    const tableDefinitionQueries = get(relPermTableDefinitionQueriesAtom);

    if (!get(selectedEnsembleIdentsAtom).isValidInContext || !get(selectedTableNameAtom).isValidInContext) {
        return [];
    }

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
