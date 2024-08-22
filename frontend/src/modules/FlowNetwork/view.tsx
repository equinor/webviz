import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ContentError, ContentInfo } from "@modules/_shared/components/ContentMessage";
import { GroupTreePlot } from "@webviz/group-tree-plot";

import { Interfaces } from "./interfaces";
import { QueryStatus } from "./types";

export function View({ viewContext }: ModuleViewProps<Interfaces>) {
    const edgeMetadataList = viewContext.useSettingsToViewInterfaceValue("edgeMetadataList");
    const nodeMetadataList = viewContext.useSettingsToViewInterfaceValue("nodeMetadataList");
    const datedTrees = viewContext.useSettingsToViewInterfaceValue("datedTrees");
    const selectedEdgeKey = viewContext.useSettingsToViewInterfaceValue("selectedEdgeKey");
    const selectedNodeKey = viewContext.useSettingsToViewInterfaceValue("selectedNodeKey");
    const selectedDateTime = viewContext.useSettingsToViewInterfaceValue("selectedDateTime");
    const queryStatus = viewContext.useSettingsToViewInterfaceValue("queryStatus");

    const statusWriter = useViewStatusWriter(viewContext);
    statusWriter.setLoading(queryStatus === QueryStatus.Loading);

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
                    edgeMetadataList={edgeMetadataList}
                    nodeMetadataList={nodeMetadataList}
                    datedTrees={datedTrees}
                    selectedEdgeKey={selectedEdgeKey}
                    selectedNodeKey={selectedNodeKey}
                    selectedDateTime={selectedDateTime}
                />
            )}
        </div>
    );
}
