import { LayerRegistry } from "./LayerRegistry";
import { DrilledWellTrajectoriesLayer } from "./implementations/DrilledWellTrajectoriesLayer";
import { DrilledWellborePicksLayer } from "./implementations/DrilledWellborePicksLayer";

LayerRegistry.registerLayer("DrilledWellborePicksLayer", {
    customDataLayerImplementation: DrilledWellborePicksLayer,
});

LayerRegistry.registerLayer("DrilledWellTrajectoriesLayer", {
    customDataLayerImplementation: DrilledWellTrajectoriesLayer,
});
