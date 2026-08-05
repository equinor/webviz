import { atom } from "jotai";

import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { filterEnsembleIdentsByType } from "@framework/utils/ensembleIdentUtils";
import type { EnsembleIdentWithRealizations } from "@modules/_shared/InplaceVolumes/queryHooks";
import { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";

import { colorByAtom, filterAtom, plotTypeAtom, selectorColumnAtom, subplotByAtom } from "./baseAtoms";

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
    return groupByIndices;
});

export const ensembleIdentsWithRealizationsAtom = atom((get) => {
    const filter = get(filterAtom);
    const ensembleIdents = filter?.ensembleIdents ?? [];
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    // Delta ensembles are not yet supported for volume data in this module.
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
