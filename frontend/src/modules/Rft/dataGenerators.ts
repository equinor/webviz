import type { ChannelContentMetaData, DataGenerator } from "@framework/types/dataChannnel";

import type { RftRealizationCurve } from "./typesAndEnums";
import { interpolateValueAtDepth } from "./utils/curveUtils";

export function makeRftDepthDataGenerator(
    entries: RftRealizationCurve[],
    depth: number,
    metaData: ChannelContentMetaData,
): DataGenerator {
    return () => {
        const data: { key: number; value: number }[] = [];
        for (const entry of entries) {
            const value = interpolateValueAtDepth(entry.depths, entry.values, depth);
            if (Number.isFinite(value)) {
                data.push({ key: entry.realization, value });
            }
        }
        return { data, metaData };
    };
}
