import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";

import { ObservedSurfaceLayer } from "./ObservedSurfaceLayer";
import { RealizationGridLayer } from "./RealizationGridLayer";

LayerRegistry.registerLayer("ObservedSurfaceLayer", {
    customDataLayerImplementation: ObservedSurfaceLayer,
});

LayerRegistry.registerLayer("RealizationGridLayer", {
    customDataLayerImplementation: RealizationGridLayer,
});
