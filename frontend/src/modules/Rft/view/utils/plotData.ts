import type { RftObservation_api } from "@api";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import type { RftEnsembleObservationsData } from "../../typesAndEnums";

export function makeDepthRange(entries: { depths: number[] }[]): [number, number] | null {
    let minDepth = Number.POSITIVE_INFINITY;
    let maxDepth = Number.NEGATIVE_INFINITY;

    for (const entry of entries) {
        for (const depth of entry.depths) {
            minDepth = Math.min(minDepth, depth);
            maxDepth = Math.max(maxDepth, depth);
        }
    }

    if (!Number.isFinite(minDepth) || !Number.isFinite(maxDepth)) {
        return null;
    }

    return [minDepth, maxDepth];
}

export function makeValueRange(
    entries: { values: number[] }[],
    observationRows: RftObservation_api[],
): [number, number] | null {
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;

    for (const entry of entries) {
        for (const value of entry.values) {
            minValue = Math.min(minValue, value);
            maxValue = Math.max(maxValue, value);
        }
    }
    for (const observation of observationRows) {
        minValue = Math.min(minValue, observation.value - observation.error);
        maxValue = Math.max(maxValue, observation.value + observation.error);
    }

    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
        return null;
    }

    return [minValue, maxValue];
}

export function extractObservationRows(
    observationsData: RftEnsembleObservationsData[],
    wellName: string,
    timestampUtcMs: number,
    responseName: string,
): RftObservation_api[] {
    const dateString = timestampUtcMsToCompactIsoString(timestampUtcMs).split("T")[0];

    for (const ensembleObservations of observationsData) {
        const matchingGroup = ensembleObservations.observations.find(
            (group) => group.well_name === wellName && group.date.split("T")[0] === dateString,
        );
        if (matchingGroup) {
            return matchingGroup.observations.filter(
                (observation) => observation.property.toUpperCase() === responseName.toUpperCase(),
            );
        }
    }

    return [];
}
