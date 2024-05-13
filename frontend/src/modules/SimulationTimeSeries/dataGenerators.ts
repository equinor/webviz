import { VectorRealizationData_api } from "@api";
import { ChannelContentMetaData, DataGenerator } from "@framework/DataChannelTypes";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { simulationUnitReformat, simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

import { VectorSpec } from "./typesAndEnums";

export function makeVectorGroupDataGenerator(
    vectorSpecification: VectorSpec,
    vectorSpecificationsAndRealizationData: {
        vectorSpecification: VectorSpec;
        data: VectorRealizationData_api[];
    }[],
    activeTimestampUtcMs: number,
    makeEnsembleDisplayName: (ensembleIdent: EnsembleIdent) => string
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
                vec.vectorSpecification.ensembleIdent.equals(vectorSpecification.ensembleIdent)
        );
        if (vector) {
            let unit = "";
            vector.data.forEach((el) => {
                unit = simulationUnitReformat(el.unit);
                const indexOfTimestamp = el.timestamps_utc_ms.indexOf(activeTimestampUtcMs);
                data.push({
                    key: el.realization,
                    value: indexOfTimestamp === -1 ? el.values[0] : el.values[indexOfTimestamp],
                });
            });
            metaData = {
                unit,
                ensembleIdentString: vector.vectorSpecification.ensembleIdent.toString(),
                displayString: `${simulationVectorDescription(
                    vector.vectorSpecification.vectorName
                )} (${makeEnsembleDisplayName(vector.vectorSpecification.ensembleIdent)})`,
            };
        }
        return {
            data,
            metaData: metaData ?? undefined,
        };
    };
}
