import { ChannelContentDefinition } from "@framework/DataChannelTypes";
import { ViewContext } from "@framework/ModuleContext";
import { Interfaces } from "@modules/SimulationTimeSeries/interfaces";

import { useAtomValue } from "jotai";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

import { ChannelIds } from "../../channelDefs";
import { makeVectorGroupDataGenerator } from "../../dataGenerators";
import {
    activeTimestampUtcMsAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    queryIsFetchingAtom,
} from "../atoms/derivedAtoms";

export function usePublishToDataChannels(viewContext: ViewContext<Interfaces>) {
    const loadedVectorSpecificationsAndRealizationData = useAtomValue(loadedVectorSpecificationsAndRealizationDataAtom);
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);
    const isQueryFetching = useAtomValue(queryIsFetchingAtom);

    const makeEnsembleDisplayName = useMakeEnsembleDisplayNameFunc(viewContext);

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

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.TIME_SERIES,
        dependencies: [loadedVectorSpecificationsAndRealizationData, activeTimestampUtcMs],
        enabled: !isQueryFetching,
        contents,
    });
}
