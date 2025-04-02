import { DataProviderRegistry } from "./DataProviderRegistry";
import { DataProviderType } from "./dataProviderTypes";
import { DrilledWellTrajectories } from "./implementations/DrilledWellTrajectories";
import { DrilledWellborePicks } from "./implementations/DrilledWellborePicks";

DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELLBORE_PICKS, DrilledWellborePicks);
DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELL_TRAJECTORIES, DrilledWellTrajectories);
