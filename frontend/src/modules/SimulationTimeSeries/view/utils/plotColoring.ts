import type { VectorHexColorMap, VectorSpec } from "@modules/SimulationTimeSeries/typesAndEnums";

import { SubplotOwner } from "./PlotBuilder";

export function getHexColorFromOwner(
    owner: SubplotOwner,
    vectorSpec: VectorSpec,
    vectorHexColors: VectorHexColorMap,
    traceFallbackColor = "#000000",
): string {
    let color: string | null = null;
    if (owner === SubplotOwner.ENSEMBLE) {
        color = vectorHexColors[vectorSpec.vectorName];
    } else if (owner === SubplotOwner.VECTOR) {
        color = vectorSpec.color;
    }
    return color ?? traceFallbackColor;
}
