import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";

import { ObservedSurfaceLayer } from "./ObservedSurfaceLayer";
import { RealizationGridLayer } from "./RealizationGridLayer";
import { RealizationPolygonsLayer } from "./RealizationPolygonsLayer";
import { RealizationSurfaceLayer } from "./RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "./StatisticalSurfaceLayer";

LayerRegistry.registerLayer("ObservedSurfaceLayer", ObservedSurfaceLayer);
LayerRegistry.registerLayer("RealizationGridLayer", RealizationGridLayer);
LayerRegistry.registerLayer("RealizationPolygonsLayer", RealizationPolygonsLayer);
LayerRegistry.registerLayer("RealizationSurfaceLayer", RealizationSurfaceLayer);
LayerRegistry.registerLayer("StatisticalSurfaceLayer", StatisticalSurfaceLayer);
