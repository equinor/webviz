import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";

import { ObservedSurfaceLayer } from "./ObservedSurfaceLayer";
import { RealizationGridLayer } from "./RealizationGridLayer";

LayerRegistry.registerLayer("ObservedSurfaceLayer", ObservedSurfaceLayer);
LayerRegistry.registerLayer("RealizationGridLayer", RealizationGridLayer);
