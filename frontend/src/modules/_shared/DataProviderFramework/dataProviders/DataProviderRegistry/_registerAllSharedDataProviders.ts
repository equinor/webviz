import { DataProviderType } from "../dataProviderTypes";
import { DrilledWellborePicksProvider } from "../implementations/DrilledWellborePicksProvider";
import { DrilledWellTrajectoriesProvider } from "../implementations/DrilledWellTrajectoriesProvider";
import { RealizationGridProvider } from "../implementations/RealizationGridProvider";
import { RealizationPolygonsProvider } from "../implementations/RealizationPolygonsProvider";
import { RealizationSurfaceProvider } from "../implementations/RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "../implementations/StatisticalSurfaceProvider";

import { DataProviderRegistry } from "./_DataProviderRegistry";

DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELLBORE_PICKS, DrilledWellborePicksProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELL_TRAJECTORIES, DrilledWellTrajectoriesProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.REALIZATION_GRID, RealizationGridProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.REALIZATION_POLYGONS, RealizationPolygonsProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.REALIZATION_SURFACE, RealizationSurfaceProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.STATISTICAL_SURFACE, StatisticalSurfaceProvider);
