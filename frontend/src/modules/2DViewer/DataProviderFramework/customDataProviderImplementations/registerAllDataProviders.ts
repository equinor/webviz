import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { ObservedSurface } from "./ObservedSurface";
import { RealizationGrid } from "./RealizationGrid";
import { RealizationPolygons } from "./RealizationPolygons";
import { RealizationSurface } from "./RealizationSurface";
import { StatisticalSurface } from "./StatisticalSurface";
import { CustomDataProviderType } from "./dataProviderTypes";

DataProviderRegistry.registerDataProvider(CustomDataProviderType.OBSERVED_SURFACE, ObservedSurface);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_GRID, RealizationGrid);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_POLYGONS, RealizationPolygons);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_SURFACE, RealizationSurface);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.STATISTICAL_SURFACE, StatisticalSurface);
