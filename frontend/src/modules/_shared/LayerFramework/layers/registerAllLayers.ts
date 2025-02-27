import { LayerRegistry } from "./LayerRegistry";
import { DrilledWellTrajectoriesLayer } from "./implementations/DrilledWellTrajectoriesLayer";
import { DrilledWellborePicksLayer } from "./implementations/DrilledWellborePicksLayer";

LayerRegistry.registerLayer("DrilledWellborePicksLayer", DrilledWellborePicksLayer);
LayerRegistry.registerLayer("DrilledWellTrajectoriesLayer", DrilledWellTrajectoriesLayer);
