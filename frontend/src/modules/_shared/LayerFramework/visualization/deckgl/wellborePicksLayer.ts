import { WellborePick_api } from "@api";
import { WellborePickLayerData, WellborePicksLayer } from "@modules/_shared/customDeckGlLayers/WellborePicksLayer";

import { VisualizationFunctionArgs } from "../VisualizationFactory";

export function makeWellborePicksLayer({
    id,
    data,
}: VisualizationFunctionArgs<any, WellborePick_api[]>): WellborePicksLayer {
    const wellPicksData: WellborePickLayerData[] = data.map((wellborePick) => {
        return {
            easting: wellborePick.easting,
            northing: wellborePick.northing,
            wellBoreUwi: wellborePick.wellboreUuid,
            tvdMsl: wellborePick.tvdMsl,
            md: wellborePick.md,
            slotName: "",
        };
    });

    return new WellborePicksLayer({
        id,
        data: wellPicksData,
        pickable: true,
    });
}
