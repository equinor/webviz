import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { ViewContext } from "@framework/ModuleContext";
import { makeVectorDataGenerator } from "@modules/SimulationTimeSeriesSensitivity/dataGenerators";
import type { Interfaces } from "@modules/SimulationTimeSeriesSensitivity/interfaces";

import { useAtomValue } from "jotai";

import { ChannelIds } from "../../channelDefs";
import { vectorSpecificationAtom } from "../atoms/baseAtoms";
import { activeTimestampUtcMsAtom } from "../atoms/derivedAtoms";
import { vectorDataQueryAtom } from "../atoms/queryAtoms";

export function usePublishToDataChannels(viewContext: ViewContext<Interfaces>) {
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const vectorSpecification = useAtomValue(vectorSpecificationAtom);
    const vectorDataQuery = useAtomValue(vectorDataQueryAtom);
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);

    const ensemble = vectorSpecification ? ensembleSet.findEnsemble(vectorSpecification.ensembleIdent) : null;

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.REALIZATION_VALUE,
        dependencies: [vectorSpecification, vectorDataQuery.data, ensemble, activeTimestampUtcMs],
        contents: [
            {
                contentIdString: vectorSpecification?.vectorName ?? "",
                displayName: vectorSpecification?.vectorName ?? "",
                dataGenerator: makeVectorDataGenerator(ensemble, vectorDataQuery.data ?? null, activeTimestampUtcMs),
            },
        ],
    });
}
