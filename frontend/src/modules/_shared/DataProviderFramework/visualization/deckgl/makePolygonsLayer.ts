import { PolygonsLayer } from "@modules/_shared/customDeckGlLayers/PolygonsLayer";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    RealizationPolygonsData,
    RealizationPolygonsProviderMeta,
} from "../../dataProviders/implementations/RealizationPolygonsProvider";

import type { PolygonVisualizationSettings } from "./polygonUtils";

export function makePolygonsLayer({
    id,
    state,
}: TransformerArgs<RealizationPolygonsData, RealizationPolygonsProviderMeta>): PolygonsLayer | null {
    const snapshot = state?.snapshot;
    if (!snapshot) {
        return null;
    }

    const polygonsData = snapshot.data;

    if (!polygonsData) {
        return null;
    }

    const visualizationSettings = snapshot.meta.polygonVisualization;

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
