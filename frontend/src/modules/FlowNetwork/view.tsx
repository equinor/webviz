import React from "react";

import type { DatedTree, EdgeMetadata, NodeMetadata } from "@webviz/group-tree-plot";
import { GroupTreePlot } from "@webviz/group-tree-plot";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ContentError, ContentInfo } from "@modules/_shared/components/ContentMessage";
import { simulationUnitReformat } from "@modules/_shared/reservoirSimulationStringUtils";

import type { Interfaces } from "./interfaces";
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
    const convertedEdgeMetadataList = React.useMemo(() => {
        return edgeMetadataList.map<EdgeMetadata>((elm) => ({
            key: elm.key,
            label: elm.label,
            unit: elm.unit ? simulationUnitReformat(elm.unit) : "",
        }));
    }, [edgeMetadataList]);
    const convertedNodeMetadataList = React.useMemo(() => {
        return nodeMetadataList.map<NodeMetadata>((elm) => ({
            key: elm.key,
            label: elm.label,
            unit: elm.unit ? simulationUnitReformat(elm.unit) : "",
        }));
    }, [nodeMetadataList]);

    return (
        <div className="w-full h-full">
            {queryStatus === QueryStatus.Loading ? (
                <ContentInfo>
                    <CircularProgress />
                </ContentInfo>
            ) : queryStatus === QueryStatus.Error ? (
                <ContentError>Error loading group tree data.</ContentError>
            ) : !datedTrees.length ? (
                <ContentInfo>No dated trees found</ContentInfo>
            ) : (
                <GroupTreePlot
                    id="test_id"
                    initialVisibleDepth={1}
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
