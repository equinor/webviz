import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { RealizationSeismicCrosslineProvider } from "./customDataProviderImplementations/RealizationSeismicCrosslineProvider";
import { RealizationSeismicDepthSliceProvider } from "./customDataProviderImplementations/RealizationSeismicDepthProvider";
import { RealizationSeismicInlineProvider } from "./customDataProviderImplementations/RealizationSeismicInlineProvider";
import { CustomDataProviderType } from "./customDataProviderTypes";
import { RealizationGridProvider } from "./customDataProviderImplementations/RealizationGridProvider";

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
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIIZATION_GRID_3D, RealizationGridProvider);
