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
    // Realizations without a sample at this time are left out - there is no interpolation (yet)
    activeTimestampUtcMs: number | null,
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
                const indexOfTimestamp =
                    activeTimestampUtcMs === null ? -1 : el.timestampsUtcMs.indexOf(activeTimestampUtcMs);
                if (indexOfTimestamp === -1) {
                    return;
                }
                data.push({ key: el.realization, value: el.values[indexOfTimestamp] });
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
