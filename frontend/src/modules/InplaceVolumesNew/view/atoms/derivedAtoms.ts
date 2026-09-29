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
    getRealizationsForSensitivityCases,
    makeRealizationToSensitivityCaseLabelMap,
    makeSensitivityCaseLabelOrder,
} from "@modules/_shared/InplaceVolumes/sensitivityUtils";
import { isFluidSpecificResultName, TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";

import {
    colorByAtom,
    filterAtom,
    plotTypeAtom,
    resultNameAtom,
    selectorColumnAtom,
    sensitivitySelectionAtom,
    subplotByAtom,
} from "./baseAtoms";

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
    const realizationToLabel = makeRealizationToSensitivityCaseLabelMap(
        sensitivities,
        sensitivitySelection.selectedCases,
    );
    const labelsWithRealizations = new Set(
        Array.from(realizationToLabel.entries())
            .filter(([realization]) => validRealizations.has(realization))
            .map(([, label]) => label),
    );
    return makeSensitivityCaseLabelOrder(sensitivities, sensitivitySelection.selectedCases).filter(
        (label) => !labelsWithRealizations.has(label),
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

export const groupByIndicesAtom = atom((get) => {
    const subplotBy = get(subplotByAtom);
    const colorBy = get(colorByAtom);
    const plotType = get(plotTypeAtom);
    const selectorColumn = get(selectorColumnAtom);
    const resultName = get(resultNameAtom);
    const indicesWithValues = get(indicesWithValuesAtom);

    const validIndexColumns = indicesWithValues.map((indexWithValue) => indexWithValue.indexColumn);

    const groupByIndices: string[] = [];
    if (validIndexColumns.includes(subplotBy as any)) {
        groupByIndices.push(subplotBy);
    }
    if (validIndexColumns.includes(colorBy as any)) {
        groupByIndices.push(colorBy);
    }

    // Only request selectorColumns when plotting bar plots
    if (selectorColumn !== null && plotType === PlotType.BAR && validIndexColumns.includes(selectorColumn)) {
        groupByIndices.push(selectorColumn);
    }

    // Fluid specific properties (BO/BG) are discarded by the backend when the fluids are summed,
    // so FLUID must always be part of the grouping for these results.
    if (
        isFluidSpecificResultName(resultName) &&
        validIndexColumns.includes(TableOriginKey.FLUID as any) &&
        !groupByIndices.includes(TableOriginKey.FLUID)
    ) {
        groupByIndices.push(TableOriginKey.FLUID);
    }

    return groupByIndices;
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
            const caseRealizations = new Set(
                getRealizationsForSensitivityCases(sensitivities, sensitivitySelection.selectedCases),
            );
            realizations = realizations.filter((realization) => caseRealizations.has(realization));
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
