import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { CustomDataProviderType } from "./dataProviderTypes";
import { ObservedSurfaceProvider, SurfaceDataFormat } from "./ObservedSurfaceProvider";
import { RealizationGridProvider } from "./RealizationGridProvider";

DataProviderRegistry.registerDataProvider(CustomDataProviderType.OBSERVED_SURFACE, ObservedSurfaceProvider, [
    SurfaceDataFormat.FLOAT,
]);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_GRID_2D, RealizationGridProvider);
