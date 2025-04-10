import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { CustomDataProviderType } from "./dataProviderTypes";
import { ObservedSurfaceProvider } from "./ObservedSurfaceProvider";
import { RealizationGridProvider } from "./RealizationGridProvider";
import { RealizationPolygonsProvider } from "./RealizationPolygonsProvider";
import { RealizationSurfaceProvider } from "./RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "./StatisticalSurfaceProvider";

DataProviderRegistry.registerDataProvider(CustomDataProviderType.OBSERVED_SURFACE, ObservedSurfaceProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_GRID, RealizationGridProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_POLYGONS, RealizationPolygonsProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_SURFACE, RealizationSurfaceProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.STATISTICAL_SURFACE, StatisticalSurfaceProvider);
