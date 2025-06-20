import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";

import { AreaPlotProvider } from "./dataProviders/plots/AreaPlotProvider";
import { DiffPlotProvider } from "./dataProviders/plots/DiffPlotProvider";
import { LinearPlotProvider } from "./dataProviders/plots/LinearPlotProvider";
import { StackedPlotProvider } from "./dataProviders/plots/StackedPlotProvider";
import { WellborePicksProvider } from "./dataProviders/wellpicks/WellPicksProvider";
import { CustomDataProviderType } from "./dataProviderTypes";
import { ContinuousLogTrack } from "./groups/ContinuousLogTrack";
import { DiffPlotGroup } from "./groups/DiffPlotGroup";
import { DiscreteLogTrack } from "./groups/DiscreteLogTrack";

GroupRegistry.registerGroup(GroupType.WELL_LOG_TRACK_CONT, ContinuousLogTrack);
GroupRegistry.registerGroup(GroupType.WELL_LOG_TRACK_DISC, DiscreteLogTrack);
GroupRegistry.registerGroup(GroupType.WELL_LOG_DIFF_GROUP, DiffPlotGroup);

DataProviderRegistry.registerDataProvider(CustomDataProviderType.LINEAR_PLOT, LinearPlotProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.AREA_PLOT, AreaPlotProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.DIFF_PLOT, DiffPlotProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.WELLBORE_PICKS, WellborePicksProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.STACKED_PLOT, StackedPlotProvider);
