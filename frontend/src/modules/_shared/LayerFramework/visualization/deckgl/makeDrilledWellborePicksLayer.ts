import { WellborePick_api } from "@api";
import { WellborePicksLayer, WellborePicksLayerData } from "@modules/_shared/customDeckGlLayers/WellborePicksLayer";

import { VisualizationFunctionArgs } from "../VisualizationFactory";

export function makeDrilledWellborePicksLayer({
    id,
    getData,
}: VisualizationFunctionArgs<any, WellborePick_api[]>): WellborePicksLayer | null {
    const data = getData();

    if (!data) {
        return null;
    }

    const wellPicksData: WellborePicksLayerData[] = data.map((wellborePick) => {
        return {
            easting: wellborePick.easting,
            northing: wellborePick.northing,
            wellBoreUwi: wellborePick.uniqueWellboreIdentifier,
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
