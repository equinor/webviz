import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";

import { inplaceVolumeAbbreviations } from "./abbreviations";

function getReadableSelectorName(selector: string): string {
    if (selector === TableOriginKey.ENSEMBLE) return "Ensemble";
    if (selector === TableOriginKey.TABLE_NAME) return "Grid source";
    if (selector === TableOriginKey.FLUID) return "Fluid zone";
    if (selector === "ZONE") return "Zone";
    if (selector === "REGION") return "Region";
    if (selector === "FACIES") return "Facies";
    if (selector === "LICENCE") return "Licence";
    if (selector === "REAL") return "Realization";
    return selector;
}

export function makeInplaceVolumesPlotTitle(firstResultName: string | null, groupByName?: string): string {
    let title = firstResultName ? `${inplaceVolumeAbbreviations[firstResultName].label} (${firstResultName})` : "";

    if (groupByName) {
        title += ` per ${getReadableSelectorName(groupByName)}`;
    }

    return title;
}
