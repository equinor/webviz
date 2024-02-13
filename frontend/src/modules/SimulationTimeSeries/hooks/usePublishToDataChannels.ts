import { ChannelContentDefinition } from "@framework/DataChannelTypes";
import { ModuleContext } from "@framework/ModuleContext";

import { useAtomValue } from "jotai";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

import {
    activeTimestampUtcMsAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    queryIsFetchingAtom,
} from "../atoms/derivedViewAtoms";
import { ChannelIds } from "../channelDefs";
import { makeVectorGroupDataGenerator } from "../dataGenerators";

export function usePublishToDataChannels(moduleContext: ModuleContext<any>) {
    const loadedVectorSpecificationsAndRealizationData = useAtomValue(loadedVectorSpecificationsAndRealizationDataAtom);
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);
    const isQueryFetching = useAtomValue(queryIsFetchingAtom);

    const makeEnsembleDisplayName = useMakeEnsembleDisplayNameFunc();

    const contents: ChannelContentDefinition[] = loadedVectorSpecificationsAndRealizationData.map((el) => ({
        contentIdString: `${el.vectorSpecification.vectorName}-::-${el.vectorSpecification.ensembleIdent}`,
        displayName: `${el.vectorSpecification.vectorName} (${makeEnsembleDisplayName(
            el.vectorSpecification.ensembleIdent
        )})`,
        dataGenerator: makeVectorGroupDataGenerator(
            el.vectorSpecification,
            loadedVectorSpecificationsAndRealizationData,
            activeTimestampUtcMs ?? 0,
            makeEnsembleDisplayName
        ),
    }));

    moduleContext.usePublishChannelContents({
        channelIdString: ChannelIds.TIME_SERIES,
        dependencies: [loadedVectorSpecificationsAndRealizationData, activeTimestampUtcMs],
        enabled: !isQueryFetching,
        contents,
    });
}
