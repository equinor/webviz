import { DatedTree, EdgeMetadata, NodeMetadata } from "@webviz/group-tree-plot";

export enum StatisticsOrRealization {Statistics="Statistics", Realization="Realization"}

export enum QueryStatus {Loading="Loading", Error="Error", Idle="Idle"}

export type State = {
    edgeMetadataList: EdgeMetadata[];
    nodeMetadataList: NodeMetadata[];
    datedTrees: DatedTree[];
    selectedEdgeKey: string;
    selectedNodeKey: string;
    selectedDateTime: string;
    queryStatus: QueryStatus;
};


