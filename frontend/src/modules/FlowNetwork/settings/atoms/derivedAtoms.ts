import { atom } from "jotai";

import type { DatedFlowNetwork_api, FlowNetworkMetadata_api } from "@api";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";

import { QueryStatus } from "../../types";

import { selectedEnsembleIdentAtom, selectedTreeTypeAtom } from "./persistableFixableAtoms";
import { realizationFlowNetworkQueryAtom } from "./queryAtoms";

export const availableRealizationsAtom = atom<number[]>((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom).value;
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const validRealizationNumbers = selectedEnsembleIdent
        ? [...validEnsembleRealizationsFunction(selectedEnsembleIdent)]
        : [];
    return validRealizationNumbers;
});

export const queryStatusAtom = atom<QueryStatus>((get) => {
    const flowNetworkQuery = get(realizationFlowNetworkQueryAtom);

    if (flowNetworkQuery.isFetching) {
        return QueryStatus.Loading;
    }
    if (flowNetworkQuery.isError) {
        return QueryStatus.Error;
    }
    return QueryStatus.Idle;
});

export const availableTreeTypesAtom = atom<string[]>((get) => {
    const flowNetworkQuery = get(realizationFlowNetworkQueryAtom);

    if (!flowNetworkQuery.data) return [];

    return Object.keys(flowNetworkQuery.data.tree_type_flow_network_map);
});

export const availableDateTimesAtom = atom<string[]>((get) => {
    const flowNetworkQuery = get(realizationFlowNetworkQueryAtom);
    const selectedTreeType = get(selectedTreeTypeAtom).value;

    if (!flowNetworkQuery.data || !selectedTreeType) {
        return [];
    }

    const dateTimes = new Set<string>();
    flowNetworkQuery.data.tree_type_flow_network_map[selectedTreeType].datedNetworks.forEach((datedNetwork) => {
        datedNetwork.dates.forEach((date) => {
            dateTimes.add(date);
        });
    });

    return Array.from(dateTimes);
});

export const edgeMetadataListAtom = atom<FlowNetworkMetadata_api[]>((get) => {
    const flowNetworkQuery = get(realizationFlowNetworkQueryAtom);
    const selectedTreeType = get(selectedTreeTypeAtom).value;

    if (!flowNetworkQuery.data || !selectedTreeType) {
        return [];
    }

    return flowNetworkQuery.data.tree_type_flow_network_map[selectedTreeType].edgeMetadataList;
});

export const nodeMetadataListAtom = atom<FlowNetworkMetadata_api[]>((get) => {
    const flowNetworkQuery = get(realizationFlowNetworkQueryAtom);
    const selectedTreeType = get(selectedTreeTypeAtom).value;

    if (!flowNetworkQuery.data || !selectedTreeType) {
        return [];
    }

    return flowNetworkQuery.data.tree_type_flow_network_map[selectedTreeType].nodeMetadataList;
});

export const datedNetworksAtom = atom<DatedFlowNetwork_api[]>((get) => {
    const flowNetworkQuery = get(realizationFlowNetworkQueryAtom);
    const selectedTreeType = get(selectedTreeTypeAtom).value;

    if (!flowNetworkQuery.data || !selectedTreeType) {
        return [];
    }

    return flowNetworkQuery.data.tree_type_flow_network_map[selectedTreeType].datedNetworks;
});
