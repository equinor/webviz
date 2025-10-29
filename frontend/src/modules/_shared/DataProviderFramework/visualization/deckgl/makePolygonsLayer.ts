import { PolygonsLayer } from "@modules/_shared/customDeckGlLayers/PolygonsLayer";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    RealizationPolygonsData,
    RealizationPolygonsSettings,
} from "../../dataProviders/implementations/RealizationPolygonsProvider";
import { Setting } from "../../settings/settingsDefinitions";

import type { PolygonVisualizationSettings } from "./polygonUtils";

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

    // Convert the setting to the layer format
    const layerVisualizationSettings: PolygonVisualizationSettings | null = visualizationSettings
        ? {
              color: visualizationSettings.color,
              lineThickness: visualizationSettings.lineThickness,
              lineOpacity: visualizationSettings.lineOpacity,
              fill: visualizationSettings.fill,
              fillOpacity: visualizationSettings.fillOpacity,
              showLabels: visualizationSettings.showLabels,
              labelPosition: visualizationSettings.labelPosition,
              labelColor: visualizationSettings.labelColor,
          }
        : null;

    return new PolygonsLayer({
        id,
        data: polygonsData,
        visualizationSettings: layerVisualizationSettings,
    });
}
