import { atom } from "jotai";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { filterEnsembleIdentsByType } from "@framework/utils/ensembleIdentUtils";
import type {
    DeltaEnsembleIdentWithRealizations,
    EnsembleIdentWithRealizations,
} from "@modules/_shared/InplaceVolumes/queryHooks";
import { isFluidSpecificResultName, TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";

import { colorByAtom, filterAtom, plotTypeAtom, resultNameAtom, selectorColumnAtom, subplotByAtom } from "./baseAtoms";

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

    // NOTE: Delta ensembles are handled separately in `deltaEnsembleIdentsWithRealizationsAtom`.
    const regularEnsembleIdents = filterEnsembleIdentsByType(ensembleIdents, RegularEnsembleIdent);

    const ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[] = [];
    for (const ensembleIdent of regularEnsembleIdents) {
        ensembleIdentsWithRealizations.push({
            ensembleIdent,
            realizations: [...validEnsembleRealizationsFunction(ensembleIdent)],
        });
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
