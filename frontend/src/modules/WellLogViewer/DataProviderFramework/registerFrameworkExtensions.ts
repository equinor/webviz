import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";

import { AreaPlotProvider } from "./dataProviders/plots/AreaPlotProvider";
import { DifferentialPlotProvider } from "./dataProviders/plots/DiffPlotProvider";
import { LinearPlotProvider } from "./dataProviders/plots/LinearPlotProvider";
import { StackedPlotProvider } from "./dataProviders/plots/StackedPlotProvider";
import { WellborePicksProvider } from "./dataProviders/wellpicks/WellPicksProvider";
import { ContinuousLogTrack } from "./groups/ContinuousLogTrack";
import { DiscreteLogTrack } from "./groups/DiscreteLogTrack";

// ? It confuses me why there's a difference in registration of groups and providers? Why does one check an external enum, while the other does not?
GroupRegistry.registerGroup(GroupType.WELL_LOG_TRACK_CONT, ContinuousLogTrack);
GroupRegistry.registerGroup(GroupType.WELL_LOG_TRACK_DISC, DiscreteLogTrack);

DataProviderRegistry.registerDataProvider(LinearPlotProvider.name, LinearPlotProvider);
DataProviderRegistry.registerDataProvider(AreaPlotProvider.name, AreaPlotProvider);
DataProviderRegistry.registerDataProvider(DifferentialPlotProvider.name, DifferentialPlotProvider);
DataProviderRegistry.registerDataProvider(WellborePicksProvider.name, WellborePicksProvider);
DataProviderRegistry.registerDataProvider(StackedPlotProvider.name, StackedPlotProvider);
