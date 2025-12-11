import { InplaceVolumesSelectorMapping } from "@modules/_shared/InplaceVolumes/types";

import { inplaceVolumeAbbreviations } from "./abbreviations";
export function makeInplaceVolumesPlotTitle(firstResultName: string | null, groupByName?: string): string {
    let title = firstResultName ? `${inplaceVolumeAbbreviations[firstResultName].label} (${firstResultName})` : "";

    if (groupByName) {
        title += ` per ${InplaceVolumesSelectorMapping[groupByName] ?? groupByName}`;
    }

    return title;
}
