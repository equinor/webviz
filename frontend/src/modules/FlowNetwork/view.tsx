import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ContentError, ContentInfo } from "@modules/_shared/components/ContentMessage";
import { DatedTree, EdgeMetadata, GroupTreePlot, NodeMetadata } from "@webviz/group-tree-plot";

import { Interfaces } from "./interfaces";
import { QueryStatus } from "./types";

export function View({ viewContext }: ModuleViewProps<Interfaces>) {
    const edgeMetadataList = viewContext.useSettingsToViewInterfaceValue("edgeMetadataList");
    const nodeMetadataList = viewContext.useSettingsToViewInterfaceValue("nodeMetadataList");
    const datedNetworks = viewContext.useSettingsToViewInterfaceValue("datedNetworks");
    const selectedEdgeKey = viewContext.useSettingsToViewInterfaceValue("selectedEdgeKey");
    const selectedNodeKey = viewContext.useSettingsToViewInterfaceValue("selectedNodeKey");
    const selectedDateTime = viewContext.useSettingsToViewInterfaceValue("selectedDateTime");
    const queryStatus = viewContext.useSettingsToViewInterfaceValue("queryStatus");

    const statusWriter = useViewStatusWriter(viewContext);
    statusWriter.setLoading(queryStatus === QueryStatus.Loading);

    // Convert datedNetworks to datedTrees
    const datedTrees: DatedTree[] = React.useMemo(() => {
        return datedNetworks.map((datedNetwork) => {
            return {
                dates: datedNetwork.dates,
                tree: datedNetwork.network,
            };
        });
    }, [datedNetworks]);

    // Convert metadata lists to front-end format
    const convertedEdgeMetadataList: EdgeMetadata[] = React.useMemo(() => {
        return edgeMetadataList.map((elm) => ({ key: elm.key, label: elm.label }));
    }, [edgeMetadataList]);
    const convertedNodeMetadataList: NodeMetadata[] = React.useMemo(() => {
        return nodeMetadataList.map((elm) => ({ key: elm.key, label: elm.label }));
    }, [nodeMetadataList]);

    return (
        <div className="w-full h-full">
            {queryStatus === QueryStatus.Loading ? (
                <ContentInfo>
                    <CircularProgress />
                </ContentInfo>
            ) : queryStatus === QueryStatus.Error ? (
                <ContentError>Error loading group tree data.</ContentError>
            ) : (
                <GroupTreePlot
                    id="test_id"
                    edgeMetadataList={convertedEdgeMetadataList}
                    nodeMetadataList={convertedNodeMetadataList}
                    datedTrees={datedTrees}
                    selectedEdgeKey={selectedEdgeKey}
                    selectedNodeKey={selectedNodeKey}
                    selectedDateTime={selectedDateTime}
                />
            )}
        </div>
    );
}
