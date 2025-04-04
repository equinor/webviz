import { GroupRegistry } from "@modules/_shared/LayerFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/LayerFramework/groups/groupTypes";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";

import { AreaPlotProvider } from "./dataProviders/plots/AreaPlotProvider";
import { DifferentialPlotProvider } from "./dataProviders/plots/DiffPlotProvider";
import { LinearPlotProvider } from "./dataProviders/plots/LinearPlotProvider";
import { WellborePicksProvider } from "./dataProviders/wellpicks/WellPicksProvider";
import { ContinuousLogTrack } from "./groups/ContinuousLogTrack";

GroupRegistry.registerGroup(GroupType.WELL_LOG_TRACK, ContinuousLogTrack);

LayerRegistry.registerLayer(LinearPlotProvider.name, LinearPlotProvider);
LayerRegistry.registerLayer(AreaPlotProvider.name, AreaPlotProvider);
LayerRegistry.registerLayer(DifferentialPlotProvider.name, DifferentialPlotProvider);
LayerRegistry.registerLayer(WellborePicksProvider.name, WellborePicksProvider);
