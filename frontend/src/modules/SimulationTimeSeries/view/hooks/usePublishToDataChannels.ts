import { useAtomValue } from "jotai";

import type { VectorRealizationData_api } from "@api";
import type { ViewContext } from "@framework/ModuleContext";
import type { ChannelContentDefinition } from "@framework/types/dataChannnel";
import { ChannelIds } from "@modules/SimulationTimeSeries/channelDefs";
import { makeVectorGroupDataGenerator } from "@modules/SimulationTimeSeries/dataGenerators";
import type { Interfaces } from "@modules/SimulationTimeSeries/interfaces";
import type { VectorHexColorMap, VectorSpec } from "@modules/SimulationTimeSeries/typesAndEnums";

import {
    activeTimestampUtcMsAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    queryIsFetchingAtom,
} from "../atoms/derivedAtoms";
import type { SubplotOwner } from "../utils/PlotBuilder";
import { getHexColorFromOwner } from "../utils/plotColoring";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

export function usePublishToDataChannels(
    viewContext: ViewContext<Interfaces>,
    subplotOwner: SubplotOwner,
    vectorHexColorMap: VectorHexColorMap,
): void {
    const loadedVectorSpecificationsAndRealizationData = useAtomValue(loadedVectorSpecificationsAndRealizationDataAtom);
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);
    const isQueryFetching = useAtomValue(queryIsFetchingAtom);

    const makeEnsembleDisplayName = useMakeEnsembleDisplayNameFunc(viewContext);

    const vectorSpecificationsAndRealizationData: {
        vectorSpecification: VectorSpec;
        data: VectorRealizationData_api[];
    }[] = [];
    for (const elm of loadedVectorSpecificationsAndRealizationData) {
        const vectorSpec: VectorSpec = {
            ...elm.vectorSpecification,
            ensembleIdent: elm.vectorSpecification.ensembleIdent,
        };

        vectorSpecificationsAndRealizationData.push({
            vectorSpecification: vectorSpec,
            data: elm.data,
        });
    }

    const contents: ChannelContentDefinition[] = [];
    for (const elm of vectorSpecificationsAndRealizationData) {
        const hexColor = getHexColorFromOwner(subplotOwner, elm.vectorSpecification, vectorHexColorMap);
        contents.push({
            contentIdString: `${elm.vectorSpecification.vectorName}-::-${elm.vectorSpecification.ensembleIdent}`,
            displayName: `${elm.vectorSpecification.vectorName} (${makeEnsembleDisplayName(
                elm.vectorSpecification.ensembleIdent,
            )})`,
            dataGenerator: makeVectorGroupDataGenerator(
                elm.vectorSpecification,
                vectorSpecificationsAndRealizationData,
                activeTimestampUtcMs ?? 0,
                makeEnsembleDisplayName,
                hexColor,
            ),
        });
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.TIME_SERIES,
        dependencies: [vectorSpecificationsAndRealizationData, activeTimestampUtcMs, subplotOwner],
        enabled: !isQueryFetching,
        contents,
    });
}
