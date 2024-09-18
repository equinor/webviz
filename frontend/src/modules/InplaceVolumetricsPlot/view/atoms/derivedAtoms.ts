import { InplaceVolumetricsIdentifier_api } from "@api";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { EnsembleIdentWithRealizations } from "@modules/_shared/InplaceVolumetrics/queryHooks";
import { SourceIdentifier } from "@modules/_shared/InplaceVolumetrics/types";

import { atom } from "jotai";

import { colorByAtom, filterAtom, selectorColumnAtom, subplotByAtom } from "./baseAtoms";

export const tableNamesAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.tableNames ?? [];
});

export const fluidZonesAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.fluidZones ?? [];
});

export const identifiersValuesAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.identifiersValues ?? [];
});

export const doAccumulateFluidZonesAtom = atom((get) => {
    const subplotBy = get(subplotByAtom);
    const colorBy = get(colorByAtom);

    const doAccumulateFluidZones = subplotBy !== SourceIdentifier.FLUID_ZONE && colorBy !== SourceIdentifier.FLUID_ZONE;
    return doAccumulateFluidZones;
});

export const groupByIdentifiersAtom = atom((get) => {
    const subplotBy = get(subplotByAtom);
    const colorBy = get(colorByAtom);
    const selectorColumn = get(selectorColumnAtom);

    const groupByIdentifiers: InplaceVolumetricsIdentifier_api[] = [];
    if (Object.values(InplaceVolumetricsIdentifier_api).includes(subplotBy as any)) {
        groupByIdentifiers.push(subplotBy as InplaceVolumetricsIdentifier_api);
    }
    if (Object.values(InplaceVolumetricsIdentifier_api).includes(colorBy as any)) {
        groupByIdentifiers.push(colorBy as InplaceVolumetricsIdentifier_api);
    }
    if (selectorColumn !== null && Object.values(InplaceVolumetricsIdentifier_api).includes(selectorColumn as any)) {
        groupByIdentifiers.push(selectorColumn as InplaceVolumetricsIdentifier_api);
    }
    return groupByIdentifiers;
});

export const ensembleIdentsWithRealizationsAtom = atom((get) => {
    const filter = get(filterAtom);
    const ensemblIdents = filter?.ensembleIdents ?? [];
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[] = [];
    for (const ensembleIdent of ensemblIdents) {
        ensembleIdentsWithRealizations.push({
            ensembleIdent,
            realizations: [...validEnsembleRealizationsFunction(ensembleIdent)],
        });
    }

    return ensembleIdentsWithRealizations;
});
