import type { VectorRealizationData_api } from "@api";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { DataGenerator } from "@framework/types/dataChannnel";

export function makeVectorDataGenerator(
    ensemble: RegularEnsemble | null,
    vectorRealizationData: VectorRealizationData_api[] | null,
    // Realizations without a sample at this time are left out - there is no interpolation (yet)
    activeTimestampUtcMs: number | null,
): DataGenerator {
    return () => {
        const data: { key: number; value: number }[] = [];

        if (ensemble && vectorRealizationData) {
            vectorRealizationData.forEach((vec) => {
                const indexOfTimestamp =
                    activeTimestampUtcMs === null ? -1 : vec.timestampsUtcMs.indexOf(activeTimestampUtcMs);
                if (indexOfTimestamp === -1) {
                    return;
                }
                data.push({ key: vec.realization, value: vec.values[indexOfTimestamp] });
            });
        }
        return {
            data,
            metaData: {
                ensembleIdentString: ensemble?.getIdent().toString() ?? "",
                unit: vectorRealizationData?.[0]?.unit ?? "",
            },
        };
    };
}
