import type { VectorRealizationData_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ChannelContentMetaData, DataGenerator } from "@framework/types/dataChannnel";
import { simulationUnitReformat, simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

import type { VectorSpec } from "./typesAndEnums";

export function makeVectorGroupDataGenerator(
    vectorSpecification: VectorSpec,
    vectorSpecificationsAndRealizationData: {
        vectorSpecification: VectorSpec;
        data: VectorRealizationData_api[];
    }[],
    activeTimestampUtcMs: number,
    makeEnsembleDisplayName: (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) => string,
    preferredColor: string,
): DataGenerator {
    return () => {
        const data: { key: number; value: number }[] = [];
        let metaData: ChannelContentMetaData = {
            unit: "",
            ensembleIdentString: "",
            displayString: "",
        };

        const vector = vectorSpecificationsAndRealizationData.find(
            (vec) =>
                vec.vectorSpecification.vectorName === vectorSpecification.vectorName &&
                vec.vectorSpecification.ensembleIdent.equals(vectorSpecification.ensembleIdent),
        );

        if (vector) {
            let unit = "";
            vector.data.forEach((el) => {
                unit = simulationUnitReformat(el.unit);
                const indexOfTimestamp = el.timestampsUtcMs.indexOf(activeTimestampUtcMs);
                data.push({
                    key: el.realization,
                    value: indexOfTimestamp === -1 ? el.values[0] : el.values[indexOfTimestamp],
                });
            });
            metaData = {
                unit,
                ensembleIdentString: vector.vectorSpecification.ensembleIdent.toString(),
                displayString: `${simulationVectorDescription(
                    vector.vectorSpecification.vectorName,
                )} (${makeEnsembleDisplayName(vector.vectorSpecification.ensembleIdent)})`,
                preferredColor,
            };
        }
        return {
            data,
            metaData: metaData ?? undefined,
        };
    };
}
