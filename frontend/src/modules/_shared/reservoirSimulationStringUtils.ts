import { VectorDefinition, vectorDefinitions } from "@assets/vectorDefinitions";

import { reservoirSimulationUnitTerminology } from "./reservoirSimulationUnitTerminology";

/**
 * Returns a more human friendly description of the input unit if possible, otherwise returns the input unit as is.
 */
export function simulationUnitReformat(eclUnit: string, unitSystem = "METRIC"): string {
    return reservoirSimulationUnitTerminology[unitSystem]?.[eclUnit] ?? eclUnit;
}

/**
 * Returns vector definition for vector if it exists, otherwise returns null.
 */
function getVectorDefinition(vector: string): VectorDefinition | null {
    if (vector in vectorDefinitions) {
        return vectorDefinitions[vector];
    }
    return null;
}

/**
 * Returns a more human friendly description of the vector name if possible, otherwise returns the vector name as is.
 *
 * Optional prefix and suffix can be added to the description. These are added before and after the vector base name description.
 * This implies suffix to be added in front of any well, region or completion description.
 *
 * Exampled usage: simulationVectorDescription("WOPR:A1", "Average ", " Per Day") => "Average Oil Production Rate Per Day, well A1"
 *
 * NOTE:
 *   - Based on https://github.com/equinor/webviz-subsurface/blob/master/webviz_subsurface/_abbreviations/reservoir_simulation.py
 *   - Handle user defined vectors later on
 */
export function simulationVectorDescription(
    vector: string,
    vectorBasePrefix?: string,
    vectorBaseSuffix?: string
): string {
    const prefix = vectorBasePrefix ?? "";
    const suffix = vectorBaseSuffix ?? "";

    let vectorName = vector;
    let node: string | null = null;
    if (vector.includes(":")) {
        [vectorName, node] = vector.split(":", 2);
    }

    // Handle regions and completions
    if (vectorName.length === 8) {
        if (vectorName[0] === "R") {
            // Region vectors for other FIP regions than FIPNUM are written on a special form:
            // 8 signs, with the last 3 defining the region.
            // E.g.: For an array "FIPREG": ROIP is ROIP_REG, RPR is RPR__REG and ROIPL is ROIPLREG
            // Underscores _ are always used to fill

            const vectorBaseName = vectorName.slice(0, 5).replace(/_+$/, ""); // Equivalent to rstrip("_")
            const fip = vectorName.slice(5);

            const definition = getVectorDefinition(vectorBaseName);
            if (definition && definition.type === "region") {
                return `${prefix}${definition.description}${suffix}, region ${fip} ${node ?? ""}`;
            }
        } else if (vectorName[0] === "W" && vectorName[4] === "L") {
            // These are completion vectors, e.g. WWCTL:__1:OP_1 and WOPRL_10:OP_1 for
            // water-cut in OP_1 completion 1 and oil production rate in OP_1 completion 10

            const vectorBaseName = vector.slice(0, 5);
            const comp = vectorName.slice(5).replace(/^_+/, ""); // Equivalent to lstrip("_")

            const definition = getVectorDefinition(vectorBaseName);
            if (definition && definition.type === "completion") {
                return `${prefix}${definition.description}${suffix}, well ${node ?? ""} completion ${comp}`;
            }
        }
    }

    const definition = getVectorDefinition(vectorName);
    if (definition) {
        if (node === null) {
            return `${prefix}${definition.description}${suffix}`;
        }
        return `${prefix}${definition.description}${suffix}, ${definition.type.replace(/_/g, " ")} ${node}`;
    }

    return `${prefix}${vector}${suffix}`;
}

/**
 * Returns the vector definition for the simulation vector if it exists, otherwise returns null.
 */
export function simulationVectorDefinition(vector: string): VectorDefinition | null {
    let vectorName = vector;
    if (vector.includes(":")) {
        [vectorName] = vector.split(":", 2);
    }

    // Handle regions and completions
    if (vectorName.length === 8) {
        if (vectorName[0] === "R") {
            // Region vectors for other FIP regions than FIPNUM are written on a special form:
            // 8 signs, with the last 3 defining the region.
            // E.g.: For an array "FIPREG": ROIP is ROIP_REG, RPR is RPR__REG and ROIPL is ROIPLREG
            // Underscores _ are always used to fill

            const vectorBaseName = vectorName.slice(0, 5).replace(/_+$/, ""); // Equivalent to rstrip("_")
            return getVectorDefinition(vectorBaseName);
        } else if (vectorName[0] === "W" && vectorName[4] === "L") {
            // These are completion vectors, e.g. WWCTL:__1:OP_1 and WOPRL_10:OP_1 for
            // water-cut in OP_1 completion 1 and oil production rate in OP_1 completion 10

            const vectorBaseName = vector.slice(0, 5);
            return getVectorDefinition(vectorBaseName);
        }
    }

    return getVectorDefinition(vectorName);
}
