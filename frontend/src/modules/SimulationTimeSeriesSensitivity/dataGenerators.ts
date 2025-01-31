import { VectorRealizationData_api } from "@api";
import { DataGenerator } from "@framework/DataChannelTypes";
import { RegularEnsemble } from "@framework/RegularEnsemble";

import { indexOf } from "lodash";

export function makeVectorDataGenerator(
    ensemble: RegularEnsemble | null,
    vectorRealizationData: VectorRealizationData_api[] | null,
    activeTimestampUtcMs: number | null
): DataGenerator {
    return () => {
        const data: { key: number; value: number }[] = [];

        if (ensemble && vectorRealizationData) {
            vectorRealizationData.forEach((vec) => {
                const indexOfTimestamp = indexOf(vec.timestampsUtcMs, activeTimestampUtcMs);
                data.push({
                    key: vec.realization,
                    value: indexOfTimestamp === -1 ? 0 : vec.values[indexOfTimestamp],
                });
            });
        }
        return {
            data,
            metaData: {
                ensembleIdentString: ensemble?.getIdent().toString() ?? "",
                unit: "unit",
            },
        };
    };
}
