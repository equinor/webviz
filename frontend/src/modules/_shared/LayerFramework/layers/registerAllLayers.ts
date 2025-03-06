import { LayerRegistry } from "./LayerRegistry";
import { DrilledWellTrajectoriesLayer } from "./implementations/DrilledWellTrajectoriesLayer";
import { DrilledWellborePicksLayer } from "./implementations/DrilledWellborePicksLayer";
import { LayerType } from "./layerTypes";

LayerRegistry.registerLayer(LayerType.DRILLED_WELLBORE_PICKS, DrilledWellborePicksLayer);
LayerRegistry.registerLayer(LayerType.DRILLED_WELL_TRAJECTORIES, DrilledWellTrajectoriesLayer);
