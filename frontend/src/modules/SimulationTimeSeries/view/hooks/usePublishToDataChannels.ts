import { ChannelContentDefinition } from "@framework/DataChannelTypes";
import { ViewContext } from "@framework/ModuleContext";
import { SettingsAtoms } from "@modules/SimulationTimeSeries/settings/atoms/atomDefinitions";
import { Interface } from "@modules/SimulationTimeSeries/settingsToViewInterface";
import { State } from "@modules/SimulationTimeSeries/state";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

import { ChannelIds } from "../../channelDefs";
import { makeVectorGroupDataGenerator } from "../../dataGenerators";
import { ViewAtoms } from "../atoms/atomDefinitions";

export function usePublishToDataChannels(viewContext: ViewContext<State, Interface, SettingsAtoms, ViewAtoms>) {
    const loadedVectorSpecificationsAndRealizationData = viewContext.useViewAtomValue(
        "loadedVectorSpecificationsAndRealizationData"
    );
    const activeTimestampUtcMs = viewContext.useViewAtomValue("activeTimestampUtcMs");
    const isQueryFetching = viewContext.useViewAtomValue("queryIsFetching");

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
