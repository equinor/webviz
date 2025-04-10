import { useAtomValue } from "jotai";

import type { VectorRealizationData_api } from "@api";
import type { ChannelContentDefinition } from "@framework/DataChannelTypes";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import type { Interfaces } from "@modules/SimulationTimeSeries/interfaces";


import { ChannelIds } from "../../channelDefs";
import type { RegularEnsembleVectorSpec } from "../../dataGenerators";
import { makeVectorGroupDataGenerator } from "../../dataGenerators";
import {
    activeTimestampUtcMsAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    queryIsFetchingAtom,
} from "../atoms/derivedAtoms";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

export function usePublishToDataChannels(viewContext: ViewContext<Interfaces>) {
    const loadedVectorSpecificationsAndRealizationData = useAtomValue(loadedVectorSpecificationsAndRealizationDataAtom);
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);
    const isQueryFetching = useAtomValue(queryIsFetchingAtom);

    const makeEnsembleDisplayName = useMakeEnsembleDisplayNameFunc(viewContext);

    // Only publish regular ensemble data to the time series channel
    const regularEnsembleVectorSpecificationsAndRealizationData: {
        vectorSpecification: RegularEnsembleVectorSpec;
        data: VectorRealizationData_api[];
    }[] = [];
    for (const elm of loadedVectorSpecificationsAndRealizationData) {
        if (!isEnsembleIdentOfType(elm.vectorSpecification.ensembleIdent, RegularEnsembleIdent)) {
            continue;
        }

        const regularEnsembleVectorSpec: RegularEnsembleVectorSpec = {
            ...elm.vectorSpecification,
            ensembleIdent: elm.vectorSpecification.ensembleIdent,
        };

        regularEnsembleVectorSpecificationsAndRealizationData.push({
            vectorSpecification: regularEnsembleVectorSpec,
            data: elm.data,
        });
    }

    const contents: ChannelContentDefinition[] = [];
    for (const elm of regularEnsembleVectorSpecificationsAndRealizationData) {
        contents.push({
            contentIdString: `${elm.vectorSpecification.vectorName}-::-${elm.vectorSpecification.ensembleIdent}`,
            displayName: `${elm.vectorSpecification.vectorName} (${makeEnsembleDisplayName(
                elm.vectorSpecification.ensembleIdent,
            )})`,
            dataGenerator: makeVectorGroupDataGenerator(
                elm.vectorSpecification,
                regularEnsembleVectorSpecificationsAndRealizationData,
                activeTimestampUtcMs ?? 0,
                makeEnsembleDisplayName,
            ),
        });
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.TIME_SERIES,
        dependencies: [regularEnsembleVectorSpecificationsAndRealizationData, activeTimestampUtcMs],
        enabled: !isQueryFetching,
        contents,
    });
}
