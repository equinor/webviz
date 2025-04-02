import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { ObservedSurface } from "./ObservedSurface";
import { RealizationGrid } from "./RealizationGrid";
import { RealizationPolygons } from "./RealizationPolygons";
import { RealizationSurface } from "./RealizationSurface";
import { StatisticalSurface } from "./StatisticalSurface";
import { CustomLayerType } from "./layerTypes";

DataProviderRegistry.registerDataProvider(CustomLayerType.OBSERVED_SURFACE, ObservedSurface);
DataProviderRegistry.registerDataProvider(CustomLayerType.REALIZATION_GRID, RealizationGrid);
DataProviderRegistry.registerDataProvider(CustomLayerType.REALIZATION_POLYGONS, RealizationPolygons);
DataProviderRegistry.registerDataProvider(CustomLayerType.REALIZATION_SURFACE, RealizationSurface);
DataProviderRegistry.registerDataProvider(CustomLayerType.STATISTICAL_SURFACE, StatisticalSurface);
