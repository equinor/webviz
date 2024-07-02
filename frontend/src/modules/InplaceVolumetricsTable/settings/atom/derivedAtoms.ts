import { InplaceVolumetricsIndexNames_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";

import { atom } from "jotai";

import {
    userSelectedEnsembleIdentsAtom,
    userSelectedResponsesAtom,
    userSelectedTableSourcesAtom,
    userSelectedZonesAtom,
} from "./baseAtoms";
import { inplaceTableDefinitionsQueriesAtom } from "./queryAtoms";

import { AvailableInplaceVolumetricsIndices, QueriesStatus } from "../../types";

export const selectedEnsembleIdentsAtom = atom<EnsembleIdent[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    const newSelectedEnsembleIdents = userSelectedEnsembleIdents.filter((ensemble) =>
        ensembleSet.hasEnsemble(ensemble)
    );

    const validatedEnsembleIdents = fixupEnsembleIdents(newSelectedEnsembleIdents, ensembleSet);

    return validatedEnsembleIdents ?? [];
});

export const queriesStatusAtom = atom<QueriesStatus>((get) => {
    const inplaceTableDefinitionsQueries = get(inplaceTableDefinitionsQueriesAtom);

    if (inplaceTableDefinitionsQueries.some((query) => query.isFetching)) {
        return QueriesStatus.Loading;
    }
    if (inplaceTableDefinitionsQueries.every((query) => query.isError)) {
        return QueriesStatus.AllFailed;
    }
    if (inplaceTableDefinitionsQueries.some((query) => query.isError)) {
        return QueriesStatus.SomeFailed;
    }
    return QueriesStatus.Success;
});

export const isInplaceTableDefinitionsQueriesFetchingAtom = atom<boolean>((get) => {
    const inplaceTableDefinitionsQueries = get(inplaceTableDefinitionsQueriesAtom);

    return inplaceTableDefinitionsQueries.some((query) => query.isFetching);
});

export const availableTableSourceAtom = atom<string[]>((get) => {
    const inplaceTableDefinitionsQueries = get(inplaceTableDefinitionsQueriesAtom);

    const isFetching = get(isInplaceTableDefinitionsQueriesFetchingAtom);
    if (isFetching) {
        return [];
    }

    const availableTableSource = new Set<string>();
    for (const query of inplaceTableDefinitionsQueries) {
        if (!query.data) {
            continue;
        }

        query.data.forEach((tableDefinition) => availableTableSource.add(tableDefinition.table_name));
    }

    return Array.from(availableTableSource);
});

export const selectedTableSourcesAtom = atom<string[]>((get) => {
    const availableTableSource = get(availableTableSourceAtom);
    const userSelectedTableSources = get(userSelectedTableSourcesAtom);

    // Create list of selected among the available and user selected table sources
    const selectedTableSources = userSelectedTableSources.filter((source) => availableTableSource.includes(source));

    return selectedTableSources;
});

export const availableResponsesAtom = atom<string[]>((get) => {
    const inplaceTableDefinitionsQueries = get(inplaceTableDefinitionsQueriesAtom);
    const selectedTableSources = get(selectedTableSourcesAtom);

    const isFetching = get(isInplaceTableDefinitionsQueriesFetchingAtom);

    if (isFetching) {
        return [];
    }

    const availableResponses = new Set<string>();
    for (const query of inplaceTableDefinitionsQueries) {
        if (!query.data) {
            continue;
        }

        query.data.forEach((tableDefinition) => {
            if (!selectedTableSources.includes(tableDefinition.table_name)) {
                return;
            }

            tableDefinition.result_names.forEach((response) => availableResponses.add(response));
        });
    }

    // TODO: Convert into responses without "_OIL", "_GAS", "_WATER" suffixes
    // Add calculated responses as PORO, SW, BO, BG and more?

    return Array.from(availableResponses);
});

export const selectedResponsesAtom = atom<string[]>((get) => {
    const availableResponses = get(availableResponsesAtom);
    const userSelectedResponses = get(userSelectedResponsesAtom);

    const selectedResponses = userSelectedResponses.filter((response) => availableResponses.includes(response));
    return selectedResponses;
});

export const availableInplaceVolumetricsIndicesAtom = atom<AvailableInplaceVolumetricsIndices>((get) => {
    const inplaceTableDefinitionsQueries = get(inplaceTableDefinitionsQueriesAtom);
    const selectedTableSources = get(selectedTableSourcesAtom);

    const isFetching = get(isInplaceTableDefinitionsQueriesFetchingAtom);
    if (isFetching) {
        return { regions: [], zones: [], facies: [] };
    }

    const availableZones = new Set<string>();
    const availableRegions = new Set<string>();
    const availableFacies = new Set<string>();
    for (const query of inplaceTableDefinitionsQueries) {
        if (!query.data) {
            continue;
        }

        query.data.forEach((tableDefinition) => {
            if (!selectedTableSources.includes(tableDefinition.table_name)) {
                return;
            }

            // NOTE: Values can be string and number, how to handle this best? Always convert to string?
            tableDefinition.indexes.forEach((index) => {
                if (index.index_name === InplaceVolumetricsIndexNames_api.ZONE) {
                    index.values.forEach((value) => availableZones.add(value.toString()));
                }
                if (index.index_name === InplaceVolumetricsIndexNames_api.REGION) {
                    index.values.forEach((value) => availableRegions.add(value.toString()));
                }
                if (index.index_name === InplaceVolumetricsIndexNames_api.FACIES) {
                    index.values.forEach((value) => availableFacies.add(value.toString()));
                }
            });
        });
    }

    return {
        zones: Array.from(availableZones),
        regions: Array.from(availableRegions),
        facies: Array.from(availableFacies),
    };
});

export const selectedZonesAtom = atom<string[]>((get) => {
    const userSelectedZones = get(userSelectedZonesAtom);
    const availableIndices = get(availableInplaceVolumetricsIndicesAtom);
    const availableZones = availableIndices.zones;

    const selectedZones = userSelectedZones.filter((zone) => availableZones.includes(zone));
    return selectedZones;
});

export const selectedRegionsAtom = atom<string[]>((get) => {
    const userSelectedRegions = get(userSelectedZonesAtom);
    const availableIndices = get(availableInplaceVolumetricsIndicesAtom);
    const availableRegions = availableIndices.regions;

    const selectedRegions = userSelectedRegions.filter((region) => availableRegions.includes(region));
    return selectedRegions;
});

export const selectedFaciesAtom = atom<string[]>((get) => {
    const userSelectedFacies = get(userSelectedZonesAtom);
    const availableIndices = get(availableInplaceVolumetricsIndicesAtom);
    const availableFacies = availableIndices.facies;

    const selectedFacies = userSelectedFacies.filter((facies) => availableFacies.includes(facies));
    return selectedFacies;
});
