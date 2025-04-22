import { DataProviderRegistry } from "./DataProviderRegistry";
import { DataProviderType } from "./dataProviderTypes";
import { DrilledWellborePicksProvider } from "./implementations/DrilledWellborePicksProvider";
import { DrilledWellTrajectoriesProvider } from "./implementations/DrilledWellTrajectoriesProvider";

DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELLBORE_PICKS, DrilledWellborePicksProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELL_TRAJECTORIES, DrilledWellTrajectoriesProvider);
