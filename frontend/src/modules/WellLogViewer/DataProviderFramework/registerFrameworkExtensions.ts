import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";

import { AreaPlotProvider } from "./dataProviders/plots/AreaPlotProvider";
import { DifferentialPlotProvider } from "./dataProviders/plots/DiffPlotProvider";
import { LinearPlotProvider } from "./dataProviders/plots/LinearPlotProvider";
import { WellborePicksProvider } from "./dataProviders/wellpicks/WellPicksProvider";
import { ContinuousLogTrack } from "./groups/ContinuousLogTrack";

GroupRegistry.registerGroup(GroupType.WELL_LOG_TRACK, ContinuousLogTrack);

DataProviderRegistry.registerDataProvider(LinearPlotProvider.name, LinearPlotProvider);
DataProviderRegistry.registerDataProvider(AreaPlotProvider.name, AreaPlotProvider);
DataProviderRegistry.registerDataProvider(DifferentialPlotProvider.name, DifferentialPlotProvider);
DataProviderRegistry.registerDataProvider(WellborePicksProvider.name, WellborePicksProvider);
