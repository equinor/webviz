import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { VectorSpecWithData } from "@modules/SimulationTimeSeries/typesAndEnums";

import type { VectorEnsemblesData } from "./_utils";

export function toVectorEnsemblesDataArray<T>(
    vectorSpecWithData: VectorSpecWithData<T>[],
    makeDisplayName: (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) => string,
): VectorEnsemblesData<T>[] {
    // Group data by vector name
    const byVectorMap = new Map<string, VectorEnsemblesData<T>["perEnsembleData"]>();
    for (const elm of vectorSpecWithData) {
        const vectorName = elm.vectorSpecification.vectorName;
        const perEnsembleData = byVectorMap.get(vectorName) ?? [];
        perEnsembleData.push({
            ensembleDisplayName: makeDisplayName(elm.vectorSpecification.ensembleIdent),
            data: elm.data,
        });
        byVectorMap.set(vectorName, perEnsembleData);
    }

    // Convert from map to array
    return Array.from(byVectorMap.entries()).map(([vectorName, perEnsembleData]) => ({
        vectorName,
        perEnsembleData,
    }));
}
