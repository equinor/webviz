import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { RealizationGridProvider } from "./customDataProviderImplementations/RealizationGridProvider";
import { CustomDataProviderType } from "./customDataProviderTypes";
import { RealizationSeismicSlicesProvider } from "./customDataProviderImplementations/RealizationSeismicSlicesProvider";

DataProviderRegistry.registerDataProvider(
    CustomDataProviderType.REALIZATION_SEISMIC_SLICES,
    RealizationSeismicSlicesProvider,
);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_GRID_3D, RealizationGridProvider);
