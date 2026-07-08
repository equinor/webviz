import { atom } from "jotai";

import { EnsembleSetAtom, ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { selectedEnsembleIdentAtom, selectedGridNameAtom } from "./persistableFixableAtoms";
import { gridModelsInfoQueryAtom } from "./queryAtoms";

export const selectedEnsembleIdentValueAtom = atom<RegularEnsembleIdent | null>((get) => {
    return get(selectedEnsembleIdentAtom).value;
});

export const availableRealizationsAtom = atom<number[]>((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentValueAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    if (!selectedEnsembleIdent) {
        return [];
    }
    return [...validEnsembleRealizationsFunction(selectedEnsembleIdent)];
});

// All realizations that exist for the ensemble, ignoring the app-wide realization filter. Used to
// pick *any* realization as a reference for shared/ensemble-wide metadata (grid model info, time
// steps) - the realization filter narrows down which realizations are evaluated by the checks, it
// should not also hide the metadata itself.
export const allEnsembleRealizationsAtom = atom<number[]>((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentValueAtom);
    const ensembleSet = get(EnsembleSetAtom);

    if (!selectedEnsembleIdent) {
        return [];
    }
    return [...(ensembleSet.findEnsemble(selectedEnsembleIdent)?.getRealizations() ?? [])];
});

// Realization used to resolve the grid model time steps (t0/t1). The first realization is a safe
// choice since the grid geometry/time steps are shared across realizations. Deliberately sourced
// from all ensemble realizations rather than the (filterable) available-realizations subset, since
// the realization filter should not affect which realization is usable as a reference.
export const referenceRealizationAtom = atom<number>((get) => {
    const allEnsembleRealizations = get(allEnsembleRealizationsAtom);
    return allEnsembleRealizations[0] ?? 0;
});

export const availableGridNamesAtom = atom<string[]>((get) => {
    const gridModelsInfoQuery = get(gridModelsInfoQueryAtom);
    if (!gridModelsInfoQuery.data) {
        return [];
    }
    return gridModelsInfoQuery.data.map((gridModelInfo) => gridModelInfo.grid_name);
});

export type ResolvedTimeSteps = {
    t0Iso: string;
    t1Iso: string;
};

// Mirrors the backend's `equilibrium_logic.HYDROSTATIC_GRID_PROPERTIES` - the dynamic 3D grid
// properties whose available time steps define the hydrostatic-equilibrium check's t0/t1. Keep in
// sync with the Python list in
// `webviz_services.qc_service.hydrostatic_equilibrium.equilibrium_logic`.
const HYDROSTATIC_GRID_PROPERTIES = ["PRESSURE", "SWAT", "SGAS", "SOIL"];

// Resolves the initial t0/t1 time steps for the selected grid from its already-fetched model info
// (the same `Grid3dInfo_api` data used to populate the grid-name dropdown), mirroring the backend's
// `equilibrium_logic.resolve_initial_time_steps`. Computed once here (no extra Sumo round-trip, and
// independent of any realization/realization filter) and shared by both the vector check and the
// grid property check instead of each independently picking a reference realization to resolve
// time steps from.
export const resolvedTimeStepsAtom = atom<ResolvedTimeSteps | null>((get) => {
    const gridModelsInfoQuery = get(gridModelsInfoQueryAtom);
    const selectedGridName = get(selectedGridNameAtom).value;

    const gridInfo = gridModelsInfoQuery.data?.find((info) => info.grid_name === selectedGridName);
    if (!gridInfo) {
        return null;
    }

    const isoDates = new Set<string>();
    for (const propertyInfo of gridInfo.property_info_arr) {
        if (!HYDROSTATIC_GRID_PROPERTIES.includes(propertyInfo.property_name)) {
            continue;
        }
        // Intervals (which contain a '/') are not relevant for this check and are ignored.
        if (!propertyInfo.iso_date_or_interval || propertyInfo.iso_date_or_interval.includes("/")) {
            continue;
        }
        isoDates.add(propertyInfo.iso_date_or_interval);
    }

    const sortedIsoDates = [...isoDates].sort();
    if (sortedIsoDates.length < 2) {
        return null;
    }

    return { t0Iso: sortedIsoDates[0], t1Iso: sortedIsoDates[1] };
});
