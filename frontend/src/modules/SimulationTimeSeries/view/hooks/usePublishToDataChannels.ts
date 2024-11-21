import { ChannelContentDefinition } from "@framework/DataChannelTypes";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ViewContext } from "@framework/ModuleContext";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
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

    // Only publish regular ensemble data to the time series channel
    const validVectorSpecificationsAndRealizationData = loadedVectorSpecificationsAndRealizationData.filter((el) =>
        isEnsembleIdentOfType(el.vectorSpecification.ensembleIdent, EnsembleIdent)
    );

    const contents: ChannelContentDefinition[] = validVectorSpecificationsAndRealizationData.map((el) => ({
        contentIdString: `${el.vectorSpecification.vectorName}-::-${el.vectorSpecification.ensembleIdent}`,
        displayName: `${el.vectorSpecification.vectorName} (${makeEnsembleDisplayName(
            el.vectorSpecification.ensembleIdent as EnsembleIdent // TODO: Should not need cast here, fix type?
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
