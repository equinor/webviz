import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { CustomDataProviderType } from "./dataProviderTypes";
import { RealizationGridProvider } from "./RealizationGridProvider";
import { RichDrilledWellTrajectoriesProvider } from "./RichDrilledWellTrajectoriesProvider";

DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_GRID_2D, RealizationGridProvider);
DataProviderRegistry.registerDataProvider(
    CustomDataProviderType.RICH_DRILLED_WELL_TRAJECTORIES,
    RichDrilledWellTrajectoriesProvider,
);
