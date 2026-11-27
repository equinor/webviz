import { useAtomValue } from "jotai";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { ViewContext } from "@framework/ModuleContext";
import type { ChannelContentDefinition } from "@framework/types/dataChannnel";
import { makeVectorDataGenerator } from "@modules/SimulationTimeSeriesSensitivity/dataGenerators";
import type { Interfaces } from "@modules/SimulationTimeSeriesSensitivity/interfaces";

import { ChannelIds } from "../../channelDefs";
import { vectorSpecificationAtom } from "../atoms/baseAtoms";
import { effectiveTimestampUtcMsAtom } from "../atoms/dashboardSettingAtoms";
import { vectorDataQueryAtom } from "../atoms/queryAtoms";

export function usePublishToDataChannels(viewContext: ViewContext<Interfaces>) {
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const vectorSpecification = useAtomValue(vectorSpecificationAtom);
    const vectorDataQuery = useAtomValue(vectorDataQueryAtom);
    const effectiveTimestampUtcMs = useAtomValue(effectiveTimestampUtcMsAtom).value;

    const ensemble = vectorSpecification ? ensembleSet.findEnsemble(vectorSpecification.ensembleIdent) : null;

    // Without a sample at the selected time in any realization, there is nothing to publish - left out, so
    // receivers show that there is no data rather than fabricated values
    const hasSampleAtEffectiveTimestamp =
        effectiveTimestampUtcMs !== null &&
        (vectorDataQuery.data ?? []).some((realizationData) =>
            realizationData.timestampsUtcMs.includes(effectiveTimestampUtcMs),
        );
    const contents: ChannelContentDefinition[] = hasSampleAtEffectiveTimestamp
        ? [
              {
                  contentIdString: vectorSpecification?.vectorName ?? "",
                  displayName: vectorSpecification?.vectorName ?? "",
                  dataGenerator: makeVectorDataGenerator(ensemble, vectorDataQuery.data ?? null, effectiveTimestampUtcMs),
              },
          ]
        : [];

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.REALIZATION_VALUE,
        dependencies: [vectorSpecification, vectorDataQuery.data, ensemble, effectiveTimestampUtcMs],
        enabled: !vectorDataQuery.isFetching,
        contents,
    });
}
