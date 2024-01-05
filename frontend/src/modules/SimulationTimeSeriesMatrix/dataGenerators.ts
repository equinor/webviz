import { VectorRealizationData_api } from "@api";
import { DataGenerator, ModuleChannelContentMetaData } from "@framework/DataChannelTypes";
import { simulationUnitReformat, simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

import { indexOf } from "lodash";

import { VectorSpec } from "./state";

export function makeVectorGroupDataGenerator(
    vectorSpecificationsAndRealizationData: {
        vectorSpecification: VectorSpec;
        data: VectorRealizationData_api[];
    }[],
    activeTimestampUtcMs: number
): (vectorName: string) => ReturnType<DataGenerator> {
    return (vectorName: string) => {
        const data: { key: number; value: number }[] = [];
        let metaData: ModuleChannelContentMetaData = {
            unit: "",
            ensembleIdentString: "",
            displayString: "",
        };

        const vector = vectorSpecificationsAndRealizationData.find(
            (vec) => vec.vectorSpecification.vectorName === vectorName
        );
        if (vector) {
            let unit = "";
            vector.data.forEach((el) => {
                unit = simulationUnitReformat(el.unit);
                const indexOfTimestamp = indexOf(el.timestamps_utc_ms, activeTimestampUtcMs);
                data.push({
                    key: el.realization,
                    value: indexOfTimestamp === -1 ? el.values[0] : el.values[indexOfTimestamp],
                });
            });
            metaData = {
                unit,
                ensembleIdentString: vector.vectorSpecification.ensembleIdent.toString(),
                displayString: simulationVectorDescription(vector.vectorSpecification.vectorName),
            };
        }
        return {
            data,
            metaData: metaData ?? undefined,
        };
    };
}
