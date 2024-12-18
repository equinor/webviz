import { VectorRealizationData_api } from "@api";
import { DataGenerator } from "@framework/DataChannelTypes";
import { Ensemble } from "@framework/Ensemble";

import { indexOf } from "lodash";

export function makeVectorDataGenerator(
    ensemble: Ensemble | null,
    vectorRealizationData: VectorRealizationData_api[] | null,
    activeTimestampUtcMs: number | null
): DataGenerator {
    return () => {
        const data: { key: number; value: number }[] = [];

        if (ensemble && vectorRealizationData) {
            vectorRealizationData.forEach((vec) => {
                const indexOfTimestamp = indexOf(vec.timestamps_utc_ms, activeTimestampUtcMs);
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
