import { ModuleFCProps } from "@framework/Module";
import { CircularProgress } from "@lib/components/CircularProgress";
// import GroupTree from "@webviz/group-tree";
import { GroupTreePlot } from "@webviz/group-tree-plot";

import { State, StatisticsOrRealization, QueryStatus } from "./state";
import { useRealizationGroupTreeQuery, useStatisticsGroupTreeQuery } from "./queryHooks";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ContentError, ContentInfo } from "@modules/_shared/components/ContentMessage";


export const view = ({ moduleContext }: ModuleFCProps<State>) => {

    const edgeMetadataList = moduleContext.useStoreValue("edgeMetadataList")
    const nodeMetadataList = moduleContext.useStoreValue("nodeMetadataList")
    const datedTrees = moduleContext.useStoreValue("datedTrees")
    const selectedEdgeKey = moduleContext.useStoreValue("selectedEdgeKey")
    const selectedNodeKey = moduleContext.useStoreValue("selectedNodeKey")
    const selectedDateTime = moduleContext.useStoreValue("selectedDateTime")
    const queryStatus = moduleContext.useStoreValue("queryStatus")

    return (
        <div className="w-full h-full">
            {queryStatus === QueryStatus.Loading ? (
                    <ContentInfo>
                        <CircularProgress />
                    </ContentInfo>                    
            ) : queryStatus === QueryStatus.Error ? (
                <ContentError>
                    Error loading group tree data.
                </ContentError>                    
            ) : (
                <GroupTreePlot id="test_id" edgeMetadataList={edgeMetadataList} nodeMetadataList={nodeMetadataList} datedTrees={datedTrees} selectedEdgeKey={selectedEdgeKey} selectedNodeKey={selectedNodeKey} selectedDateTime={selectedDateTime}/>
            )}
        </div>
    );
};
