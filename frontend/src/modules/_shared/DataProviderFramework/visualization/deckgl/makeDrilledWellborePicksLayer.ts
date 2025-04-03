import type { WellborePick_api } from "@api";
import type { WellborePicksLayerData } from "@modules/_shared/customDeckGlLayers/WellborePicksLayer";
import { WellborePicksLayer } from "@modules/_shared/customDeckGlLayers/WellborePicksLayer";

import type { TransformerArgs } from "../VisualizationAssembler";

export function makeDrilledWellborePicksLayer({
    id,
    getData,
}: TransformerArgs<any, WellborePick_api[], any>): WellborePicksLayer | null {
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
