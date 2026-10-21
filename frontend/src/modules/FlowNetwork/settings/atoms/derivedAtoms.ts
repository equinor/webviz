import { atom } from "jotai";

import type { DatedFlowNetwork_api, FlowNetworkMetadata_api } from "@api";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";

import { QueryStatus } from "../../types";

import { selectedEnsembleIdentAtom, selectedRealizationAtom, selectedTreeTypeAtom } from "./persistableFixableAtoms";
import { realizationFlowNetworkQueryAtom } from "./queryAtoms";

export const availableRealizationsAtom = atom<number[]>((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom).value;
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const validRealizationNumbers = selectedEnsembleIdent
        ? [...validEnsembleRealizationsFunction(selectedEnsembleIdent)]
        : [];
    return validRealizationNumbers;
});

// A disabled query keeps its cached data and error, which belong to a selection that may no longer be
// valid (e.g. a realization excluded by the realization filter), so neither is exposed while this is false
export const areQuerySelectionsValidAtom = atom<boolean>((get) => {
    return get(selectedEnsembleIdentAtom).isValidInContext && get(selectedRealizationAtom).isValidInContext;
});

export const queryStatusAtom = atom<QueryStatus>((get) => {
    const flowNetworkQuery = get(realizationFlowNetworkQueryAtom);

    if (flowNetworkQuery.isFetching) {
        return QueryStatus.Loading;
    }
    if (flowNetworkQuery.isError && get(areQuerySelectionsValidAtom)) {
        return QueryStatus.Error;
    }
    return QueryStatus.Idle;
});

const flowNetworkDataAtom = atom((get) => {
    const flowNetworkQuery = get(realizationFlowNetworkQueryAtom);

    if (!get(areQuerySelectionsValidAtom)) {
        return null;
    }
    return flowNetworkQuery.data ?? null;
});

export const availableTreeTypesAtom = atom<string[]>((get) => {
    const flowNetworkData = get(flowNetworkDataAtom);

    if (!flowNetworkData) return [];

    return Object.keys(flowNetworkData.tree_type_flow_network_map);
});

export const availableDateTimesAtom = atom<string[]>((get) => {
    const flowNetworkData = get(flowNetworkDataAtom);
    const selectedTreeType = get(selectedTreeTypeAtom).value;

    const treeTypeFlowNetwork = selectedTreeType
        ? flowNetworkData?.tree_type_flow_network_map[selectedTreeType]
        : undefined;
    if (!treeTypeFlowNetwork) {
        return [];
    }

    const dateTimes = new Set<string>();
    treeTypeFlowNetwork.datedNetworks.forEach((datedNetwork) => {
        datedNetwork.dates.forEach((date) => {
            dateTimes.add(date);
        });
    });

    return Array.from(dateTimes);
});

export const edgeMetadataListAtom = atom<FlowNetworkMetadata_api[]>((get) => {
    const flowNetworkData = get(flowNetworkDataAtom);
    const selectedTreeType = get(selectedTreeTypeAtom).value;

    const treeTypeFlowNetwork = selectedTreeType
        ? flowNetworkData?.tree_type_flow_network_map[selectedTreeType]
        : undefined;

    return treeTypeFlowNetwork?.edgeMetadataList ?? [];
});

export const nodeMetadataListAtom = atom<FlowNetworkMetadata_api[]>((get) => {
    const flowNetworkData = get(flowNetworkDataAtom);
    const selectedTreeType = get(selectedTreeTypeAtom).value;

    const treeTypeFlowNetwork = selectedTreeType
        ? flowNetworkData?.tree_type_flow_network_map[selectedTreeType]
        : undefined;

    return treeTypeFlowNetwork?.nodeMetadataList ?? [];
});

export const datedNetworksAtom = atom<DatedFlowNetwork_api[]>((get) => {
    const flowNetworkData = get(flowNetworkDataAtom);
    const selectedTreeType = get(selectedTreeTypeAtom).value;

    const treeTypeFlowNetwork = selectedTreeType
        ? flowNetworkData?.tree_type_flow_network_map[selectedTreeType]
        : undefined;

    return treeTypeFlowNetwork?.datedNetworks ?? [];
});
