import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import { DatedTree, EdgeMetadata, NodeMetadata } from "@webviz/group-tree-plot";

import { atom } from "jotai";

import {
    userSelectedDateTimeAtom,
    userSelectedEdgeKeyAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedNodeKeyAtom,
    userSelectedRealizationNumberAtom,
    validRealizationNumbersAtom,
} from "./baseAtoms";
import { realizationGroupTreeQueryAtom } from "./queryAtoms";

import { QueryStatus } from "../../types";

export const groupTreeQueryResultAtom = atom((get) => {
    return get(realizationGroupTreeQueryAtom);
});

export const selectedEnsembleIdentAtom = atom<EnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    const validEnsembleIdent = fixupEnsembleIdent(userSelectedEnsembleIdent, ensembleSet);
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
    const groupTreeQueryResult = get(groupTreeQueryResultAtom);

    if (groupTreeQueryResult.isFetching) {
        return QueryStatus.Loading;
    }
    if (groupTreeQueryResult.isError) {
        return QueryStatus.Error;
    }
    return QueryStatus.Idle;
});

export const availableDateTimesAtom = atom<string[]>((get) => {
    const groupTreeQueryResult = get(groupTreeQueryResultAtom);

    if (!groupTreeQueryResult.data) return [];

    const dateTimes = new Set<string>();
    groupTreeQueryResult.data.dated_trees.forEach((datedTree) => {
        datedTree.dates.forEach((date) => {
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

export const availableEdgeKeysAtom = atom<string[]>((get) => {
    const groupTreeQueryResult = get(groupTreeQueryResultAtom);
    return groupTreeQueryResult.data?.edge_metadata_list.map((item) => item.key) ?? [];
});

export const selectedEdgeKeyAtom = atom<string | null>((get) => {
    const availableEdgeKeys = get(availableEdgeKeysAtom);
    const userSelectedEdgeKey = get(userSelectedEdgeKeyAtom);

    if (availableEdgeKeys.length === 0) {
        return null;
    }
    if (!userSelectedEdgeKey || !availableEdgeKeys.includes(userSelectedEdgeKey)) {
        return availableEdgeKeys[0];
    }

    return userSelectedEdgeKey;
});

export const availableNodeKeysAtom = atom<string[]>((get) => {
    const groupTreeQueryResult = get(groupTreeQueryResultAtom);
    return groupTreeQueryResult.data?.node_metadata_list.map((item) => item.key) ?? [];
});

export const selectedNodeKeyAtom = atom<string | null>((get) => {
    const availableNodeKeys = get(availableNodeKeysAtom);
    const userSelectedNodeKey = get(userSelectedNodeKeyAtom);

    if (availableNodeKeys.length === 0) {
        return null;
    }
    if (!userSelectedNodeKey || !availableNodeKeys.includes(userSelectedNodeKey)) {
        return availableNodeKeys[0];
    }

    return userSelectedNodeKey;
});

export const edgeMetadataListAtom = atom<EdgeMetadata[]>((get) => {
    const groupTreeQueryResult = get(groupTreeQueryResultAtom);
    return groupTreeQueryResult.data?.edge_metadata_list ?? [];
});

export const nodeMetadataListAtom = atom<NodeMetadata[]>((get) => {
    const groupTreeQueryResult = get(groupTreeQueryResultAtom);
    return groupTreeQueryResult.data?.node_metadata_list ?? [];
});

export const datedTreesAtom = atom<DatedTree[]>((get) => {
    const groupTreeQueryResult = get(groupTreeQueryResultAtom);
    return groupTreeQueryResult.data?.dated_trees ?? [];
});
