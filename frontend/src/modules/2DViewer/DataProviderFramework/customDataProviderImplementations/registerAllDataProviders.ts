import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { ObservedSurfaceProvider } from "./ObservedSurfaceProvider";
import { RealizationGridProvider } from "./RealizationGridProvider";
import { RealizationPolygonsProvider } from "./RealizationPolygonsProvider";
import { RealizationSurfaceProvider } from "./RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "./StatisticalSurfaceProvider";
import { CustomDataProviderType } from "./dataProviderTypes";

DataProviderRegistry.registerDataProvider(CustomDataProviderType.OBSERVED_SURFACE, ObservedSurfaceProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_GRID, RealizationGridProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_POLYGONS, RealizationPolygonsProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_SURFACE, RealizationSurfaceProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.STATISTICAL_SURFACE, StatisticalSurfaceProvider);
