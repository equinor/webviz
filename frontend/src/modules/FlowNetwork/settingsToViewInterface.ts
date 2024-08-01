import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { DatedTree, EdgeMetadata, NodeMetadata } from "@webviz/group-tree-plot";

import {
    datedTreesAtom,
    edgeMetadataListAtom,
    nodeMetadataListAtom,
    queryStatusAtom,
    selectedDateTimeAtom,
    selectedEdgeKeyAtom,
    selectedNodeKeyAtom,
} from "./settings/atoms/derivedAtoms";
import { QueryStatus } from "./types";

export type State = Record<string, never>;

export type Interface = {
    edgeMetadataList: EdgeMetadata[];
    nodeMetadataList: NodeMetadata[];
    datedTrees: DatedTree[];
    selectedEdgeKey: string; // | null;
    selectedNodeKey: string; // | null;
    selectedDateTime: string; // | null;
    queryStatus: QueryStatus;
};

export const interfaceInitialization: InterfaceInitialization<Interface> = {
    edgeMetadataList: (get) => {
        return get(edgeMetadataListAtom);
    },
    nodeMetadataList: (get) => {
        return get(nodeMetadataListAtom);
    },
    datedTrees: (get) => {
        return get(datedTreesAtom);
    },
    selectedEdgeKey: (get) => {
        return get(selectedEdgeKeyAtom) ?? "";
    },
    selectedNodeKey: (get) => {
        return get(selectedNodeKeyAtom) ?? "";
    },
    selectedDateTime: (get) => {
        return get(selectedDateTimeAtom) ?? "";
    },
    queryStatus: (get) => {
        return get(queryStatusAtom);
    },
};
