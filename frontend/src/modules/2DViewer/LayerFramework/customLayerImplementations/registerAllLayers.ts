import { LayerRegistry } from "@modules/_shared/DataProviderFramework/layers/LayerRegistry";

import { ObservedSurfaceLayer } from "./ObservedSurfaceLayer";
import { RealizationGridLayer } from "./RealizationGridLayer";
import { RealizationPolygonsLayer } from "./RealizationPolygonsLayer";
import { RealizationSurfaceLayer } from "./RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "./StatisticalSurfaceLayer";
import { CustomLayerType } from "./layerTypes";

LayerRegistry.registerLayer(CustomLayerType.OBSERVED_SURFACE, ObservedSurfaceLayer);
LayerRegistry.registerLayer(CustomLayerType.REALIZATION_GRID, RealizationGridLayer);
LayerRegistry.registerLayer(CustomLayerType.REALIZATION_POLYGONS, RealizationPolygonsLayer);
LayerRegistry.registerLayer(CustomLayerType.REALIZATION_SURFACE, RealizationSurfaceLayer);
LayerRegistry.registerLayer(CustomLayerType.STATISTICAL_SURFACE, StatisticalSurfaceLayer);
