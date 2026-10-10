import { atom } from "jotai";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleSensitivities } from "@framework/EnsembleSensitivities";
import { EnsembleSetAtom, ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { filterEnsembleIdentsByType } from "@framework/utils/ensembleIdentUtils";
import type {
    DeltaEnsembleIdentWithRealizations,
    EnsembleIdentWithRealizations,
} from "@modules/_shared/InplaceVolumes/queryHooks";
import {
    findSensitivityCaseLabelsWithoutRealizations,
    makeRealizationToSensitivityCaseLabelMap,
    makeSensitivityCaseLabelOrder,
    restrictRealizationsToSensitivityCases,
} from "@modules/_shared/InplaceVolumes/sensitivityUtils";
import { TableType } from "@modules/_shared/InplaceVolumes/types";

import { filterAtom, sensitivitySelectionAtom, tableTypeAtom } from "./baseAtoms";
import { perRealizationTableDataResultsAtom, statisticalTableDataResultsAtom } from "./queryAtoms";

export const selectedEnsembleSensitivitiesAtom = atom<EnsembleSensitivities | null>((get) => {
    const sensitivitySelection = get(sensitivitySelectionAtom);
    if (!sensitivitySelection) {
        return null;
    }
    return get(EnsembleSetAtom).findEnsemble(sensitivitySelection.ensembleIdent)?.getSensitivities() ?? null;
});

export const realizationToSensitivityCaseLabelMapAtom = atom<Map<number, string> | null>((get) => {
    const sensitivities = get(selectedEnsembleSensitivitiesAtom);
    const sensitivitySelection = get(sensitivitySelectionAtom);
    if (!sensitivities || !sensitivitySelection) {
        return null;
    }
    return makeRealizationToSensitivityCaseLabelMap(sensitivities, sensitivitySelection.selectedCases);
});

export const sensitivityCaseLabelOrderAtom = atom<string[] | null>((get) => {
    const sensitivities = get(selectedEnsembleSensitivitiesAtom);
    const sensitivitySelection = get(sensitivitySelectionAtom);
    if (!sensitivities || !sensitivitySelection) {
        return null;
    }
    return makeSensitivityCaseLabelOrder(sensitivities, sensitivitySelection.selectedCases);
});

/** Labels of selected cases that have no valid realization after the realization filter. */
export const sensitivityCasesWithoutRealizationsAtom = atom<string[]>((get) => {
    const sensitivities = get(selectedEnsembleSensitivitiesAtom);
    const sensitivitySelection = get(sensitivitySelectionAtom);
    if (!sensitivities || !sensitivitySelection) {
        return [];
    }
    const validRealizations = new Set(get(ValidEnsembleRealizationsFunctionAtom)(sensitivitySelection.ensembleIdent));
    return findSensitivityCaseLabelsWithoutRealizations(
        sensitivities,
        sensitivitySelection.selectedCases,
        validRealizations,
    );
});

export const tableNamesAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.tableNames ?? [];
});

export const indicesWithValuesAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.indicesWithValues ?? [];
});

export const areSelectedTablesComparableAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.areSelectedTablesComparable ?? false;
});

export const ensembleIdentsWithRealizationsAtom = atom((get) => {
    const filter = get(filterAtom);
    const ensembleIdents = filter?.ensembleIdents ?? [];
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);
    const sensitivitySelection = get(sensitivitySelectionAtom);
    const sensitivities = get(selectedEnsembleSensitivitiesAtom);

    // NOTE: Delta ensembles are handled separately in `deltaEnsembleIdentsWithRealizationsAtom`.
    const regularEnsembleIdents = filterEnsembleIdentsByType(ensembleIdents, RegularEnsembleIdent);

    const ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[] = [];
    for (const ensembleIdent of regularEnsembleIdents) {
        let realizations = [...validEnsembleRealizationsFunction(ensembleIdent)];
        if (sensitivitySelection && sensitivities && sensitivitySelection.ensembleIdent.equals(ensembleIdent)) {
            realizations = restrictRealizationsToSensitivityCases(
                realizations,
                sensitivities,
                sensitivitySelection.selectedCases,
            );
        }
        ensembleIdentsWithRealizations.push({ ensembleIdent, realizations });
    }

    return ensembleIdentsWithRealizations;
});

export const deltaEnsembleIdentsWithRealizationsAtom = atom((get) => {
    const filter = get(filterAtom);
    const ensembleIdents = filter?.ensembleIdents ?? [];
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const deltaEnsembleIdents = filterEnsembleIdentsByType(ensembleIdents, DeltaEnsembleIdent);

    const deltaEnsembleIdentsWithRealizations: DeltaEnsembleIdentWithRealizations[] = [];
    for (const ensembleIdent of deltaEnsembleIdents) {
        deltaEnsembleIdentsWithRealizations.push({
            ensembleIdent,
            realizations: [...validEnsembleRealizationsFunction(ensembleIdent)],
        });
    }

    return deltaEnsembleIdentsWithRealizations;
});

export const activeQueriesResultAtom = atom((get) => {
    // Active queries result atom based on selected table type
    const tableType = get(tableTypeAtom);
    if (tableType === TableType.PER_REALIZATION) {
        return get(perRealizationTableDataResultsAtom);
    }
    if (tableType === TableType.STATISTICAL) {
        return get(statisticalTableDataResultsAtom);
    }
    throw new Error(`Unsupported table type: ${tableType}`);
});

export const isQueryFetchingAtom = atom((get) => {
    const activeQueriesResult = get(activeQueriesResultAtom);
    return activeQueriesResult.isFetching;
});

export const haveAllQueriesFailedAtom = atom((get) => {
    const tableType = get(tableTypeAtom);
    const perRealizationTableDataResults = get(perRealizationTableDataResultsAtom);
    const statisticalTableDataResults = get(statisticalTableDataResultsAtom);

    if (tableType === TableType.PER_REALIZATION) {
        return perRealizationTableDataResults.allQueriesFailed;
    }
    if (tableType === TableType.STATISTICAL) {
        return statisticalTableDataResults.allQueriesFailed;
    }
    return false;
});

export const haveSomeQueriesFailedAtom = atom((get) => {
    const activeQueriesResult = get(activeQueriesResultAtom);
    return activeQueriesResult.errors.length > 0 && !activeQueriesResult.allQueriesFailed;
});
