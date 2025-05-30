import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { RealizationGridProvider } from "./customDataProviderImplementations/RealizationGridProvider";
import { RealizationSeismicCrosslineProvider } from "./customDataProviderImplementations/RealizationSeismicCrosslineProvider";
import { RealizationSeismicDepthSliceProvider } from "./customDataProviderImplementations/RealizationSeismicDepthProvider";
import { RealizationSeismicInlineProvider } from "./customDataProviderImplementations/RealizationSeismicInlineProvider";
import { CustomDataProviderType } from "./customDataProviderTypes";

DataProviderRegistry.registerDataProvider(
    CustomDataProviderType.REALIZATION_SEISMIC_INLINE,
    RealizationSeismicInlineProvider,
);
DataProviderRegistry.registerDataProvider(
    CustomDataProviderType.REALIZATION_SEISMIC_CROSSLINE,
    RealizationSeismicCrosslineProvider,
);
DataProviderRegistry.registerDataProvider(
    CustomDataProviderType.REALIZATION_SEISMIC_DEPTH,
    RealizationSeismicDepthSliceProvider,
);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_GRID_3D, RealizationGridProvider);
