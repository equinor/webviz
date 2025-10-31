import { indexOf } from "lodash";

import type { VectorRealizationData_api } from "@api";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { DataGenerator } from "@framework/types/dataChannnel";

export function makeVectorDataGenerator(
    ensemble: RegularEnsemble | null,
    vectorRealizationData: VectorRealizationData_api[] | null,
    activeTimestampUtcMs: number | null,
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
