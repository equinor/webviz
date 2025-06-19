import { useAtomValue } from "jotai";

import type { VectorRealizationData_api } from "@api";
import type { ChannelContentDefinition } from "@framework/DataChannelTypes";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { ChannelIds } from "@modules/SimulationTimeSeries/channelDefs";
import type { RegularEnsembleVectorSpec } from "@modules/SimulationTimeSeries/dataGenerators";
import { makeVectorGroupDataGenerator } from "@modules/SimulationTimeSeries/dataGenerators";
import type { Interfaces } from "@modules/SimulationTimeSeries/interfaces";
import type { VectorSpec } from "@modules/SimulationTimeSeries/typesAndEnums";

import {
    activeTimestampUtcMsAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    queryIsFetchingAtom,
} from "../atoms/derivedAtoms";
import { SubplotOwner } from "../utils/PlotBuilder";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

export function usePublishToDataChannels(
    viewContext: ViewContext<Interfaces>,
    subplotOwner: SubplotOwner,
    vectorHexColors: { [key: string]: string },
): void {
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
        const hexColor = getHexColorFromOwner(subplotOwner, elm.vectorSpecification, vectorHexColors);
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
                hexColor,
            ),
        });
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.TIME_SERIES,
        dependencies: [regularEnsembleVectorSpecificationsAndRealizationData, activeTimestampUtcMs, subplotOwner],
        enabled: !isQueryFetching,
        contents,
    });
}

function getHexColorFromOwner(
    owner: SubplotOwner,
    vectorSpec: VectorSpec,
    vectorHexColors: { [key: string]: string },
): string {
    let color: string | null = null;
    if (owner === SubplotOwner.ENSEMBLE) {
        color = vectorHexColors[vectorSpec.vectorName];
    } else if (owner === SubplotOwner.VECTOR) {
        color = vectorSpec.color;
    }
    return color ?? "#000000";
}
