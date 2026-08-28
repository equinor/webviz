import { PolygonsLayer } from "@modules/_shared/customDeckGlLayers/PolygonsLayer";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    RealizationPolygonsData,
    RealizationPolygonsSettings,
} from "../../dataProviders/implementations/RealizationPolygonsProvider";
import { Setting } from "../../settings/settingsDefinitions";


export function makePolygonsLayer({
    id,
    getData,
    getSetting,
}: TransformerArgs<RealizationPolygonsSettings, RealizationPolygonsData>): PolygonsLayer | null {
    const polygonsData = getData();

    if (!polygonsData) {
        return null;
    }

    const visualizationSettings = getSetting(Setting.POLYGON_VISUALIZATION);

    return new PolygonsLayer({
        id,
        data: polygonsData,
        visualizationSettings: visualizationSettings ?? null,
    });
}
