import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { RealizationGridProvider } from "./customDataProviderImplementations/RealizationGridProvider";
import { RealizationSeismicSlicesProvider } from "./customDataProviderImplementations/RealizationSeismicSlicesProvider";
import { CustomDataProviderType } from "./customDataProviderTypes";

DataProviderRegistry.registerDataProvider(
    CustomDataProviderType.REALIZATION_SEISMIC_SLICES,
    RealizationSeismicSlicesProvider,
);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_GRID_3D, RealizationGridProvider);
