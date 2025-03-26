import { RealizationSeismicCrosslineLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicCrosslineLayer";
import { RealizationSeismicDepthSliceLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicDepthLayer";
import { RealizationSeismicInlineLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicInlineLayer";

import { LayerRegistry } from "./LayerRegistry";
import { DrilledWellTrajectoriesLayer } from "./implementations/DrilledWellTrajectoriesLayer";
import { DrilledWellborePicksLayer } from "./implementations/DrilledWellborePicksLayer";
import { IntersectionRealizationGridLayer } from "./implementations/IntersectionRealizationGridLayer";
import { ObservedSurfaceLayer } from "./implementations/ObservedSurfaceLayer";
import { RealizationGridLayer } from "./implementations/RealizationGridLayer";
import { RealizationPolygonsLayer } from "./implementations/RealizationPolygonsLayer";
import { RealizationSurfaceLayer } from "./implementations/RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "./implementations/StatisticalSurfaceLayer";
import { LayerType } from "./layerTypes";

LayerRegistry.registerLayer(LayerType.DRILLED_WELLBORE_PICKS, DrilledWellborePicksLayer);
LayerRegistry.registerLayer(LayerType.DRILLED_WELL_TRAJECTORIES, DrilledWellTrajectoriesLayer);
LayerRegistry.registerLayer(LayerType.INTERSECTION_REALIZATION_GRID, IntersectionRealizationGridLayer);
LayerRegistry.registerLayer(LayerType.REALIZATION_SURFACE, RealizationSurfaceLayer);
LayerRegistry.registerLayer(LayerType.REALIZATION_POLYGONS, RealizationPolygonsLayer);
LayerRegistry.registerLayer(LayerType.REALIZATION_SEISMIC_DEPTH_SLICE, RealizationSeismicDepthSliceLayer);
LayerRegistry.registerLayer(LayerType.REALIZATION_SEISMIC_INLINE, RealizationSeismicInlineLayer);
LayerRegistry.registerLayer(LayerType.REALIZATION_SEISMIC_CROSSLINE, RealizationSeismicCrosslineLayer);
LayerRegistry.registerLayer(LayerType.OBSERVED_SURFACE, ObservedSurfaceLayer);
LayerRegistry.registerLayer(LayerType.STATISTICAL_SURFACE, StatisticalSurfaceLayer);
LayerRegistry.registerLayer(LayerType.REALIZATION_GRID, RealizationGridLayer);
