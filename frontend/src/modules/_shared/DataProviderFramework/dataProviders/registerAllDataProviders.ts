import { DataProviderRegistry } from "./DataProviderRegistry";
import { DataProviderType } from "./dataProviderTypes";
import { DrilledWellTrajectoriesProvider } from "./implementations/DrilledWellTrajectoriesProvider";
import { DrilledWellborePicksProvider } from "./implementations/DrilledWellborePicksProvider";
import { RealizationGridProvider } from "./implementations/RealizationGridProvider";
import { RealizationPolygonsProvider } from "./implementations/RealizationPolygonsProvider";
import { RealizationSurfaceProvider } from "./implementations/RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "./implementations/StatisticalSurfaceProvider";

DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELLBORE_PICKS, DrilledWellborePicksProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELL_TRAJECTORIES, DrilledWellTrajectoriesProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.REALIZATION_GRID, RealizationGridProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.REALIZATION_POLYGONS, RealizationPolygonsProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.REALIZATION_SURFACE, RealizationSurfaceProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.STATISTICAL_SURFACE, StatisticalSurfaceProvider);
