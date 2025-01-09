import { DatedFlowNetwork_api, FlowNetworkMetadata_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { fixupRegularEnsembleIdent } from "@framework/utils/ensembleUiHelpers";

import { atom } from "jotai";

import {
    userSelectedDateTimeAtom,
    userSelectedEdgeKeyAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedNodeKeyAtom,
    userSelectedRealizationNumberAtom,
    validRealizationNumbersAtom,
} from "./baseAtoms";
import { realizationFlowNetworkQueryAtom } from "./queryAtoms";

import { QueryStatus } from "../../types";

export const flowNetworkQueryResultAtom = atom((get) => {
    return get(realizationFlowNetworkQueryAtom);
});

export const selectedEnsembleIdentAtom = atom<RegularEnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    const validEnsembleIdent = fixupRegularEnsembleIdent(userSelectedEnsembleIdent, ensembleSet);
    return validEnsembleIdent;
});

export const selectedRealizationNumberAtom = atom<number | null>((get) => {
    const userSelectedRealizationNumber = get(userSelectedRealizationNumberAtom);
    const validRealizationNumbers = get(validRealizationNumbersAtom);

    if (!validRealizationNumbers) {
        return null;
    }

    if (userSelectedRealizationNumber === null) {
        const firstRealization = validRealizationNumbers.length > 0 ? validRealizationNumbers[0] : null;
        return firstRealization;
    }

    const validRealizationNumber = validRealizationNumbers.includes(userSelectedRealizationNumber)
        ? userSelectedRealizationNumber
        : null;
    return validRealizationNumber;
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

export const selectedDateTimeAtom = atom<string | null>((get) => {
    const availableDateTimes = get(availableDateTimesAtom);
    const userSelectedDateTime = get(userSelectedDateTimeAtom);

    if (availableDateTimes.length === 0) {
        return null;
    }
    if (!userSelectedDateTime || !availableDateTimes.includes(userSelectedDateTime)) {
        return availableDateTimes[0];
    }

    return userSelectedDateTime;
});

export const edgeMetadataListAtom = atom<FlowNetworkMetadata_api[]>((get) => {
    const flowNetworkQueryResult = get(flowNetworkQueryResultAtom);

    const data = flowNetworkQueryResult.data;
    if (!data) {
        return [];
    }

    return data.edgeMetadataList;
});

export const selectedEdgeKeyAtom = atom<string | null>((get) => {
    const availableEdgesMetadataList = get(edgeMetadataListAtom);
    const availableEdgeKeys = availableEdgesMetadataList.map((item) => item.key);
    const userSelectedEdgeKey = get(userSelectedEdgeKeyAtom);

    if (availableEdgesMetadataList.length === 0) {
        return null;
    }
    if (!userSelectedEdgeKey || !availableEdgeKeys.includes(userSelectedEdgeKey)) {
        return availableEdgeKeys[0];
    }

    return userSelectedEdgeKey;
});

export const nodeMetadataListAtom = atom<FlowNetworkMetadata_api[]>((get) => {
    const flowNetworkQueryResult = get(flowNetworkQueryResultAtom);

    const data = flowNetworkQueryResult.data;
    if (!data) {
        return [];
    }

    return data.nodeMetadataList;
});

export const selectedNodeKeyAtom = atom<string | null>((get) => {
    const availableNodesMetadataList = get(nodeMetadataListAtom);
    const availableNodeKeys = availableNodesMetadataList.map((item) => item.key);
    const userSelectedNodeKey = get(userSelectedNodeKeyAtom);

    if (availableNodesMetadataList.length === 0) {
        return null;
    }
    if (!userSelectedNodeKey || !availableNodeKeys.includes(userSelectedNodeKey)) {
        return availableNodeKeys[0];
    }

    return userSelectedNodeKey;
});

export const datedNetworksAtom = atom<DatedFlowNetwork_api[]>((get) => {
    const flowNetworkQueryResult = get(flowNetworkQueryResultAtom);

    const data = flowNetworkQueryResult.data;
    if (!data) {
        return [];
    }

    return data.datedNetworks;
});
