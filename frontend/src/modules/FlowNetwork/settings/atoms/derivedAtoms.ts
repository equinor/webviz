import { atom } from "jotai";

import type { DatedFlowNetwork_api, FlowNetworkMetadata_api } from "@api";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";

import { QueryStatus } from "../../types";

import { selectedEnsembleIdentAtom } from "./persistableFixableAtoms";
import { realizationFlowNetworkQueryAtom } from "./queryAtoms";

export const flowNetworkQueryResultAtom = atom((get) => {
    return get(realizationFlowNetworkQueryAtom);
});

export const availableRealizationsAtom = atom<number[]>((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom).value;
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const validRealizationNumbers = selectedEnsembleIdent
        ? [...validEnsembleRealizationsFunction(selectedEnsembleIdent)]
        : [];
    return validRealizationNumbers;
});

export const queryStatusAtom = atom<QueryStatus>((get) => {
    const flowNetworkQueryResult = get(flowNetworkQueryResultAtom);

    if (flowNetworkQueryResult.isFetching) {
        return QueryStatus.Loading;
    }
    if (flowNetworkQueryResult.isError) {
        return QueryStatus.Error;
    }
    return QueryStatus.Idle;
});

export const availableDateTimesAtom = atom<string[]>((get) => {
    const flowNetworkQueryResult = get(flowNetworkQueryResultAtom);

    if (!flowNetworkQueryResult.data) return [];

    const dateTimes = new Set<string>();
    flowNetworkQueryResult.data.datedNetworks.forEach((datedNetwork) => {
        datedNetwork.dates.forEach((date) => {
            dateTimes.add(date);
        });
    });

    return Array.from(dateTimes);
});

export const edgeMetadataListAtom = atom<FlowNetworkMetadata_api[]>((get) => {
    const flowNetworkQueryResult = get(flowNetworkQueryResultAtom);

    const data = flowNetworkQueryResult.data;
    if (!data) {
        return [];
    }

    return data.edgeMetadataList;
});

export const nodeMetadataListAtom = atom<FlowNetworkMetadata_api[]>((get) => {
    const flowNetworkQueryResult = get(flowNetworkQueryResultAtom);

    const data = flowNetworkQueryResult.data;
    if (!data) {
        return [];
    }

    return data.nodeMetadataList;
});

export const datedNetworksAtom = atom<DatedFlowNetwork_api[]>((get) => {
    const flowNetworkQueryResult = get(flowNetworkQueryResultAtom);

    const data = flowNetworkQueryResult.data;
    if (!data) {
        return [];
    }

    return data.datedNetworks;
});
