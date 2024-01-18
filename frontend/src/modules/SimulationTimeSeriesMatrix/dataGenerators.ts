import { VectorRealizationData_api } from "@api";
import { DataGenerator, ModuleChannelContentMetaData } from "@framework/DataChannelTypes";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { simulationUnitReformat, simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

import { VectorSpec } from "./state";

export function makeVectorGroupDataGenerator(
    vectorSpecificationsAndRealizationData: {
        vectorSpecification: VectorSpec;
        data: VectorRealizationData_api[];
    }[],
    activeTimestampUtcMs: number,
    makeEnsembleDisplayName: (ensembleIdent: EnsembleIdent) => string
): (contentIdString: string) => ReturnType<DataGenerator> {
    return (contentIdString: string) => {
        const [vectorName, ensembleIdent] = contentIdString.split("-::-");
        const data: { key: number; value: number }[] = [];
        let metaData: ModuleChannelContentMetaData = {
            unit: "",
            ensembleIdentString: "",
            displayString: "",
        };

        const vector = vectorSpecificationsAndRealizationData.find(
            (vec) =>
                vec.vectorSpecification.vectorName === vectorName &&
                vec.vectorSpecification.ensembleIdent.toString() === ensembleIdent
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
