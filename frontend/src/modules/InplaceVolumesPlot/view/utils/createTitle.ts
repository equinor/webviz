import { InplaceVolumesSelectorMapping } from "@modules/_shared/InplaceVolumes/types";
import { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";

import { inplaceVolumeAbbreviations } from "./abbreviations";
export function makeInplaceVolumesPlotTitle(
    plotType: PlotType,
    firstResultName: string | null,
    secondResultName: string | null,
    groupByName?: string,
): string {
    let title = firstResultName ? `${inplaceVolumeAbbreviations[firstResultName].label} (${firstResultName})` : "";

    if (plotType === PlotType.SCATTER && secondResultName) {
        title += ` vs ${inplaceVolumeAbbreviations[secondResultName ?? ""].label ?? secondResultName}`;
    }
    if (groupByName) {
        title += ` per ${InplaceVolumesSelectorMapping[groupByName] ?? groupByName}`;
    }

    return title;
}
