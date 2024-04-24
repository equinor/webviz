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
} from "./baseAtoms";
import { realizationGroupTreeQueryAtom } from "./queryAtoms";

import { QueryStatus } from "../../types";

export const selectedEnsembleIdentAtom = atom<EnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    const validEnsembleIdent = fixupEnsembleIdent(userSelectedEnsembleIdent, ensembleSet);
    return validEnsembleIdent;
});

export const selectedRealizationNumberAtom = atom<number | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const userSelectedRealizationNumber = get(userSelectedRealizationNumberAtom);

    if (!selectedEnsembleIdent || userSelectedRealizationNumber === null) {
        return null;
    }

    const selectedEnsemble = ensembleSet.findEnsemble(selectedEnsembleIdent);
    if (!selectedEnsemble) {
        return null;
    }

    const validRealizationNumber =
        selectedEnsemble.getRealizations().find((realization) => realization === userSelectedRealizationNumber) ?? null;
    return validRealizationNumber;
});

export const isRealizationGroupTreeQueryFetchingAtom = atom<boolean>((get) => {
    const realizationGroupTreeQuery = get(realizationGroupTreeQueryAtom);
    return realizationGroupTreeQuery.isFetching;
});

export const queryStatusAtom = atom<QueryStatus>((get) => {
    const realizationGroupTreeQuery = get(realizationGroupTreeQueryAtom);

    if (realizationGroupTreeQuery.isFetching) {
        return QueryStatus.Loading;
    }
    if (realizationGroupTreeQuery.isError) {
        return QueryStatus.Error;
    }
    return QueryStatus.Idle;
});

// TODO: Handle based on selectedDataTypeOptionAtom and correct query atom in future
// NOTE: How to only update array when new query data arrives? I.e. prevent reset of array before new data arrives
export const availableDateTimesAtom = atom<string[]>((get) => {
    const realizationGroupTreeQuery = get(realizationGroupTreeQueryAtom);

    if (!realizationGroupTreeQuery.data) return [];

    const dateTimes = new Set<string>();
    realizationGroupTreeQuery.data.dated_trees.forEach((datedTree) => {
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
    const realizationGroupTreeQuery = get(realizationGroupTreeQueryAtom);
    return realizationGroupTreeQuery.data?.edge_metadata_list.map((item) => item.key) ?? [];
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
    const realizationGroupTreeQuery = get(realizationGroupTreeQueryAtom);
    return realizationGroupTreeQuery.data?.node_metadata_list.map((item) => item.key) ?? [];
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
    const realizationGroupTreeQuery = get(realizationGroupTreeQueryAtom);
    return realizationGroupTreeQuery.data?.edge_metadata_list ?? [];
});

export const nodeMetadataListAtom = atom<NodeMetadata[]>((get) => {
    const realizationGroupTreeQuery = get(realizationGroupTreeQueryAtom);
    return realizationGroupTreeQuery.data?.node_metadata_list ?? [];
});

export const datedTreesAtom = atom<DatedTree[]>((get) => {
    const realizationGroupTreeQuery = get(realizationGroupTreeQueryAtom);
    return realizationGroupTreeQuery.data?.dated_trees ?? [];
});
